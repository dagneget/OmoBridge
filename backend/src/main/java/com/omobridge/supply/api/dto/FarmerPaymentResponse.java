package com.omobridge.supply.api.dto;

import com.omobridge.supply.domain.FarmerPayment;
import com.omobridge.supply.domain.FarmerPaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record FarmerPaymentResponse(
        UUID id,
        String paymentNo,
        UUID farmerId,
        String farmerName,
        String farmerCode,
        UUID enterpriseId,
        String enterpriseName,
        BigDecimal amount,
        String currency,
        String paymentMethod,
        FarmerPaymentStatus status,
        String gatewayReference,
        Instant paidAt,
        List<PaymentAllocationResponse> allocations
) {
    public static FarmerPaymentResponse fromEntity(FarmerPayment payment) {
        return new FarmerPaymentResponse(
                payment.getId(),
                payment.getPaymentNo(),
                payment.getFarmer().getId(),
                payment.getFarmer().getUser().getFullName(),
                payment.getFarmer().getFarmerCode(),
                payment.getEnterprise().getId(),
                payment.getEnterprise().getName(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getPaymentMethod(),
                payment.getStatus(),
                payment.getGatewayReference(),
                payment.getPaidAt(),
                payment.getAllocations().stream().map(PaymentAllocationResponse::fromEntity).toList()
        );
    }
}
