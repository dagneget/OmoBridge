package com.omobridge.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.ai.api.dto.AiReportResponse;
import com.omobridge.ai.api.dto.GenerateReportRequest;
import com.omobridge.ai.domain.AiReport;
import com.omobridge.ai.domain.AiReportRepository;
import com.omobridge.ai.domain.AiReportStatus;
import com.omobridge.ai.infrastructure.AiClient;
import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.User;
import com.omobridge.orders.domain.Order;
import com.omobridge.orders.domain.OrderRepository;
import com.omobridge.supply.domain.FarmerPayable;
import com.omobridge.supply.domain.FarmerPayableRepository;
import com.omobridge.supply.domain.SupplyDelivery;
import com.omobridge.supply.domain.SupplyDeliveryRepository;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiReportService {

    private final AiReportRepository aiReportRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final SupplyDeliveryRepository supplyDeliveryRepository;
    private final FarmerPayableRepository farmerPayableRepository;
    private final OrderRepository orderRepository;
    private final AiClient aiClient;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    @Transactional
    public AiReportResponse generateReport(UUID enterpriseId, GenerateReportRequest request, User requestedBy) {
        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found: " + enterpriseId));

        // Enterprise ownership validation
        if (!enterprise.getOwnerUser().getId().equals(requestedBy.getId()) &&
                requestedBy.getRoles().stream().noneMatch(r -> r.getName().equals("ROLE_ADMIN") || r.getName().equals("SYSTEM_ADMIN"))) {
            throw new ForbiddenException("Access denied to another enterprise's AI reports");
        }

        // 1. Gather read-only performance statistics
        List<SupplyDelivery> deliveries = supplyDeliveryRepository.findAllByEnterpriseIdOrderByDeliveredAtDesc(enterpriseId);
        List<FarmerPayable> payables = farmerPayableRepository.findAllByEnterpriseIdOrderByCreatedAtDesc(enterpriseId);
        List<Order> orders = orderRepository.findByEnterpriseIdOrderByCreatedAtDesc(enterpriseId);

        BigDecimal totalFarmerPaid = payables.stream()
                .map(FarmerPayable::getAmountAllocated)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalOrderRevenue = orders.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long uniqueFarmers = deliveries.stream().map(d -> d.getFarmer().getId()).distinct().count();

        Map<String, Object> dataSnapshotMap = new HashMap<>();
        dataSnapshotMap.put("enterpriseId", enterpriseId.toString());
        dataSnapshotMap.put("enterpriseName", enterprise.getName());
        dataSnapshotMap.put("period", request.period());
        dataSnapshotMap.put("supplyDeliveriesCount", deliveries.size());
        dataSnapshotMap.put("uniqueActiveFarmers", uniqueFarmers);
        dataSnapshotMap.put("totalFarmerPaidEtb", totalFarmerPaid);
        dataSnapshotMap.put("ordersCount", orders.size());
        dataSnapshotMap.put("totalOrderRevenueEtb", totalOrderRevenue);

        // 2. Build prompt and call read-only AI client
        String lang = (request.language() != null && !request.language().isBlank()) ? request.language() : "en";
        String systemPrompt = "You are an executive agricultural business and impact analyst for OmoBridge cooperatives in South Omo, Ethiopia. "
                + "Provide an insightful, read-only performance summary. Do not alter financial or stock data.";
        String userPrompt = "Analyze this enterprise data: " + dataSnapshotMap + "\nReport type: " + request.reportType() + "\nlanguage: " + lang;

        String narrative = aiClient.generateNarrative(systemPrompt, userPrompt);

        // 3. Save report record
        AiReport report = new AiReport();
        report.setEnterprise(enterprise);
        report.setReportType(request.reportType());
        report.setPeriod(request.period());
        report.setLanguage(lang);
        report.setContent(narrative);
        report.setDataSnapshot(objectMapper.valueToTree(dataSnapshotMap));
        report.setStatus(AiReportStatus.GENERATED);
        report.setRequestedByUser(requestedBy);

        AiReport saved = aiReportRepository.save(report);
        auditService.record("AI_REPORT_GENERATED", "AI_REPORT", saved.getId(),
                "AI Report generated type=" + request.reportType() + " period=" + request.period());

        return mapToResponse(saved);
    }

    @Transactional
    public AiReportResponse approveReport(UUID reportId, boolean approve, User actor) {
        AiReport report = aiReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found: " + reportId));

        if (!report.getEnterprise().getOwnerUser().getId().equals(actor.getId()) &&
                actor.getRoles().stream().noneMatch(r -> r.getName().equals("ROLE_ADMIN") || r.getName().equals("SYSTEM_ADMIN"))) {
            throw new ForbiddenException("Access denied to approve another enterprise's report");
        }

        report.setStatus(approve ? AiReportStatus.APPROVED : AiReportStatus.REJECTED);
        report.setApprovedByUser(actor);
        AiReport saved = aiReportRepository.save(report);

        auditService.record("AI_REPORT_REVIEWED", "AI_REPORT", saved.getId(),
                "Report reviewed: status=" + saved.getStatus());

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AiReportResponse> getEnterpriseReports(UUID enterpriseId, User actor) {
        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found: " + enterpriseId));

        if (!enterprise.getOwnerUser().getId().equals(actor.getId()) &&
                actor.getRoles().stream().noneMatch(r -> r.getName().equals("ROLE_ADMIN") || r.getName().equals("SYSTEM_ADMIN"))) {
            throw new ForbiddenException("Access denied to another enterprise's reports");
        }

        return aiReportRepository.findByEnterpriseIdOrderByCreatedAtDesc(enterpriseId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    private AiReportResponse mapToResponse(AiReport r) {
        return new AiReportResponse(
                r.getId(),
                r.getEnterprise().getId(),
                r.getReportType(),
                r.getPeriod(),
                r.getLanguage(),
                r.getContent(),
                r.getStatus(),
                r.getDataSnapshot(),
                r.getCreatedAt()
        );
    }
}
