package com.omobridge.ai.service;

import com.omobridge.ai.api.dto.EnterpriseImpactMetricsResponse;
import com.omobridge.ai.api.dto.FarmerBalanceSummaryResponse;
import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.Farmer;
import com.omobridge.identity.domain.FarmerRepository;
import com.omobridge.identity.domain.User;
import com.omobridge.orders.domain.Order;
import com.omobridge.orders.domain.OrderRepository;
import com.omobridge.supply.domain.FarmerPayable;
import com.omobridge.supply.domain.FarmerPayableRepository;
import com.omobridge.supply.domain.SupplyDelivery;
import com.omobridge.supply.domain.SupplyDeliveryItem;
import com.omobridge.supply.domain.SupplyDeliveryRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ImpactReportingService {

    private final EnterpriseRepository enterpriseRepository;
    private final FarmerRepository farmerRepository;
    private final SupplyDeliveryRepository supplyDeliveryRepository;
    private final FarmerPayableRepository farmerPayableRepository;
    private final OrderRepository orderRepository;

    private void validateEnterpriseOwnership(Enterprise enterprise, User actor) {
        if (!enterprise.getOwnerUser().getId().equals(actor.getId()) &&
                actor.getRoles().stream().noneMatch(r -> r.getName().equals("ROLE_ADMIN") || r.getName().equals("SYSTEM_ADMIN"))) {
            throw new ForbiddenException("Access denied to another enterprise's metrics");
        }
    }

    @Transactional(readOnly = true)
    public EnterpriseImpactMetricsResponse getImpactMetrics(UUID enterpriseId, User actor) {
        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found: " + enterpriseId));
        validateEnterpriseOwnership(enterprise, actor);

        List<SupplyDelivery> deliveries = supplyDeliveryRepository.findAllByEnterpriseIdOrderByDeliveredAtDesc(enterpriseId);
        List<FarmerPayable> payables = farmerPayableRepository.findAllByEnterpriseIdOrderByCreatedAtDesc(enterpriseId);
        List<Order> orders = orderRepository.findByEnterpriseIdOrderByCreatedAtDesc(enterpriseId);

        long activeFarmers = deliveries.stream().map(d -> d.getFarmer().getId()).distinct().count();

        BigDecimal totalFarmerDisbursed = payables.stream()
                .map(FarmerPayable::getAmountAllocated)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSupplyQty = deliveries.stream()
                .flatMap(d -> d.getItems().stream())
                .map(SupplyDeliveryItem::getAcceptedQty)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalRevenue = orders.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal producerPriceShare = BigDecimal.ZERO;
        if (totalRevenue.compareTo(BigDecimal.ZERO) > 0) {
            producerPriceShare = totalFarmerDisbursed.multiply(BigDecimal.valueOf(100))
                    .divide(totalRevenue, 2, RoundingMode.HALF_UP);
        }

        BigDecimal householdIncomeIncrement = BigDecimal.ZERO;
        if (activeFarmers > 0) {
            householdIncomeIncrement = totalFarmerDisbursed.divide(BigDecimal.valueOf(activeFarmers), 2, RoundingMode.HALF_UP);
        }

        // Repeat buyer calculation
        Map<UUID, Long> ordersPerBuyer = orders.stream()
                .collect(Collectors.groupingBy(o -> o.getBuyer().getId(), Collectors.counting()));
        long totalBuyers = ordersPerBuyer.size();
        long repeatBuyers = ordersPerBuyer.values().stream().filter(count -> count > 1).count();
        double retentionRate = totalBuyers > 0 ? (double) repeatBuyers / totalBuyers : 0.0;

        return new EnterpriseImpactMetricsResponse(
                enterpriseId,
                activeFarmers,
                totalFarmerDisbursed,
                totalSupplyQty,
                producerPriceShare,
                householdIncomeIncrement,
                orders.size(),
                Math.round(retentionRate * 100.0) / 100.0
        );
    }

    @Transactional(readOnly = true)
    public FarmerBalanceSummaryResponse getFarmerBalances(UUID enterpriseId, User actor) {
        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found: " + enterpriseId));
        validateEnterpriseOwnership(enterprise, actor);

        List<Farmer> registeredFarmers = farmerRepository.findAllByEnterpriseId(enterpriseId);
        List<FarmerPayable> payables = farmerPayableRepository.findAllByEnterpriseIdOrderByCreatedAtDesc(enterpriseId);

        BigDecimal totalPending = payables.stream()
                .map(p -> p.getAmountDue().subtract(p.getAmountAllocated()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDisbursed = payables.stream()
                .map(FarmerPayable::getAmountAllocated)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long farmersWithPending = payables.stream()
                .filter(p -> p.getAmountDue().compareTo(p.getAmountAllocated()) > 0)
                .map(p -> p.getFarmer().getId())
                .distinct()
                .count();

        return new FarmerBalanceSummaryResponse(
                enterpriseId,
                registeredFarmers.size(),
                farmersWithPending,
                totalPending,
                totalDisbursed
        );
    }
}
