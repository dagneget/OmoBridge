package com.omobridge.supply.api.dto;

import com.omobridge.supply.domain.FarmerPayable;
import com.omobridge.supply.domain.PayableStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record FarmerPayableResponse(
        UUID id,
        String payableNo,
        UUID farmerId,
        String farmerName,
        String farmerCode,
        UUID enterpriseId,
        String enterpriseName,
        UUID deliveryItemId,
        String productName,
        BigDecimal amountDue,
        BigDecimal amountAllocated,
        BigDecimal remainingAmount,
        PayableStatus status,
        Instant createdAt
) {
    public static FarmerPayableResponse fromEntity(FarmerPayable payable) {
        BigDecimal remaining = payable.getAmountDue().subtract(payable.getAmountAllocated());
        return new FarmerPayableResponse(
                payable.getId(),
                payable.getPayableNo(),
                payable.getFarmer().getId(),
                payable.getFarmer().getUser().getFullName(),
                payable.getFarmer().getFarmerCode(),
                payable.getEnterprise().getId(),
                payable.getEnterprise().getName(),
                payable.getDeliveryItem().getId(),
                payable.getDeliveryItem().getProductType().getName(),
                payable.getAmountDue(),
                payable.getAmountAllocated(),
                remaining,
                payable.getStatus(),
                payable.getCreatedAt()
        );
    }
}
