package com.omobridge.supply.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ConflictException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.idempotency.IdempotencyRecord;
import com.omobridge.common.idempotency.IdempotencyService;
import com.omobridge.common.outbox.TransactionalOutboxService;
import com.omobridge.common.util.CodeGenerator;
import com.omobridge.common.util.MoneyUtil;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.Farmer;
import com.omobridge.identity.domain.FarmerRepository;
import com.omobridge.payments.service.PaymentGateway;
import com.omobridge.supply.api.dto.FarmerPaymentRequest;
import com.omobridge.supply.api.dto.FarmerPaymentResponse;
import com.omobridge.supply.domain.FarmerPayable;
import com.omobridge.supply.domain.FarmerPayableRepository;
import com.omobridge.supply.domain.FarmerPayment;
import com.omobridge.supply.domain.FarmerPaymentRepository;
import com.omobridge.supply.domain.FarmerPaymentStatus;
import com.omobridge.supply.domain.PayableStatus;
import com.omobridge.supply.domain.PaymentAllocation;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FarmerPaymentService {

    private final FarmerPaymentRepository paymentRepository;
    private final FarmerPayableRepository payableRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final FarmerRepository farmerRepository;
    private final PaymentGateway paymentGateway;
    private final IdempotencyService idempotencyService;
    private final CodeGenerator codeGenerator;
    private final AuditService auditService;
    private final TransactionalOutboxService outboxService;
    private final ObjectMapper objectMapper;

    @Transactional
    public FarmerPaymentResponse payFarmer(UUID enterpriseId, UUID actorUserId, FarmerPaymentRequest request, String idempotencyKey) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            String payload;
            try {
                payload = objectMapper.writeValueAsString(request);
            } catch (JsonProcessingException e) {
                payload = request.toString();
            }

            Optional<IdempotencyRecord> existing = idempotencyService.checkOrReserve(idempotencyKey, "FARMER_PAYOUT", payload);
            if (existing.isPresent() && existing.get().getResponseBody() != null) {
                try {
                    return objectMapper.readValue(existing.get().getResponseBody(), FarmerPaymentResponse.class);
                } catch (JsonProcessingException e) {
                    log.warn("Failed to deserialize saved payout response", e);
                }
            }

            if (paymentRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
                throw new ConflictException("Payment with idempotency key '" + idempotencyKey + "' already exists");
            }
        }

        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with id: " + enterpriseId));

        Farmer farmer = farmerRepository.findById(request.farmerId())
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found with id: " + request.farmerId()));

        if (farmer.getEnterprise() == null || !farmer.getEnterprise().getId().equals(enterpriseId)) {
            throw new BusinessRuleException("Farmer does not belong to this enterprise");
        }

        BigDecimal paymentAmount = MoneyUtil.roundMoney(request.amount());
        if (paymentAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("Payment amount must be greater than zero");
        }

        List<FarmerPayable> openPayables = payableRepository.findOpenAndPartialPayablesOldestFirst(farmer.getId());

        BigDecimal totalOutstanding = openPayables.stream()
                .map(p -> p.getAmountDue().subtract(p.getAmountAllocated()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (paymentAmount.compareTo(totalOutstanding) > 0) {
            throw new BusinessRuleException("Payment amount (" + paymentAmount + ") exceeds total outstanding payables (" + totalOutstanding + ")");
        }

        String gatewayReference;
        if ("TELEBIRR".equalsIgnoreCase(request.paymentMethod())) {
            PaymentGateway.PayoutRequest payoutReq = new PaymentGateway.PayoutRequest(
                    "PO-" + codeGenerator.generateReceiptNumber().replace("REC-", ""),
                    paymentAmount,
                    "ETB",
                    farmer.getUser().getPhoneNumber(),
                    "Farmer supply payout"
            );
            PaymentGateway.GatewayResponse gwResponse = paymentGateway.payout(payoutReq);
            if (!gwResponse.success()) {
                throw new BusinessRuleException("Payment gateway error: " + gwResponse.errorMessage());
            }
            gatewayReference = gwResponse.transactionId();
        } else {
            gatewayReference = "CASH-" + codeGenerator.generateReceiptNumber().replace("REC-", "");
        }

        FarmerPayment payment = new FarmerPayment();
        payment.setPaymentNo("PAY-" + codeGenerator.generateReceiptNumber().replace("REC-", ""));
        payment.setEnterprise(enterprise);
        payment.setFarmer(farmer);
        payment.setAmount(paymentAmount);
        payment.setCurrency("ETB");
        payment.setPaymentMethod(request.paymentMethod().toUpperCase());
        payment.setStatus(FarmerPaymentStatus.SUCCESS);
        payment.setGatewayReference(gatewayReference);
        payment.setIdempotencyKey(idempotencyKey);
        payment.setPaidAt(Instant.now());

        BigDecimal remainingToAllocate = paymentAmount;

        for (FarmerPayable payable : openPayables) {
            BigDecimal payableOutstanding = payable.getAmountDue().subtract(payable.getAmountAllocated());
            BigDecimal allocationAmount = remainingToAllocate.min(payableOutstanding);

            PaymentAllocation allocation = new PaymentAllocation();
            allocation.setPayable(payable);
            allocation.setAmount(allocationAmount);
            payment.addAllocation(allocation);

            payable.setAmountAllocated(payable.getAmountAllocated().add(allocationAmount));
            if (payable.getAmountAllocated().compareTo(payable.getAmountDue()) >= 0) {
                payable.setStatus(PayableStatus.SETTLED);
            } else {
                payable.setStatus(PayableStatus.PARTIAL);
            }
            payableRepository.save(payable);

            remainingToAllocate = remainingToAllocate.subtract(allocationAmount);
            if (remainingToAllocate.compareTo(BigDecimal.ZERO) == 0) {
                break;
            }
        }

        FarmerPayment saved = paymentRepository.save(payment);

        auditService.recordInCurrentTransaction(
                "FARMER_PAYMENT_PROCESSED",
                "FARMER_PAYMENT",
                saved.getId(),
                Map.of("paymentNo", saved.getPaymentNo(), "amount", saved.getAmount(), "method", saved.getPaymentMethod())
        );

        outboxService.publishInTransaction(
                "FARMER_PAYMENT_COMPLETED",
                "FARMER_PAYMENT",
                saved.getId(),
                Map.of("paymentNo", saved.getPaymentNo(), "amount", saved.getAmount(), "farmerId", farmer.getId().toString())
        );

        FarmerPaymentResponse response = FarmerPaymentResponse.fromEntity(saved);

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            try {
                idempotencyService.recordResponse(idempotencyKey, 201, objectMapper.writeValueAsString(response));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize payout response", e);
            }
        }

        return response;
    }

    @Transactional(readOnly = true)
    public FarmerPaymentResponse getPaymentById(UUID id) {
        FarmerPayment payment = paymentRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
        return FarmerPaymentResponse.fromEntity(payment);
    }

    @Transactional(readOnly = true)
    public List<FarmerPaymentResponse> getEnterprisePayments(UUID enterpriseId) {
        return paymentRepository.findAllByEnterpriseIdOrderByCreatedAtDesc(enterpriseId)
                .stream()
                .map(FarmerPaymentResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FarmerPaymentResponse> getFarmerPayments(UUID farmerId) {
        return paymentRepository.findAllByFarmerIdOrderByCreatedAtDesc(farmerId)
                .stream()
                .map(FarmerPaymentResponse::fromEntity)
                .toList();
    }
}
