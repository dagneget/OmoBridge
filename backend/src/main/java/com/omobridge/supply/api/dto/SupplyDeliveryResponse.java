package com.omobridge.supply.api.dto;

import com.omobridge.supply.domain.DeliveryStatus;
import com.omobridge.supply.domain.SupplyDelivery;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SupplyDeliveryResponse(
        UUID id,
        String deliveryNo,
        UUID enterpriseId,
        String enterpriseName,
        UUID farmerId,
        String farmerName,
        String farmerCode,
        Instant deliveredAt,
        UUID receivedByUserId,
        String receivedByUserName,
        DeliveryStatus status,
        String notes,
        BigDecimal totalDeliveredValue,
        List<SupplyDeliveryItemResponse> items
) {
    public static SupplyDeliveryResponse fromEntity(SupplyDelivery delivery) {
        BigDecimal total = delivery.getItems().stream()
                .map(SupplyDeliveryItemResponse::fromEntity)
                .map(SupplyDeliveryItemResponse::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new SupplyDeliveryResponse(
                delivery.getId(),
                delivery.getDeliveryNo(),
                delivery.getEnterprise().getId(),
                delivery.getEnterprise().getName(),
                delivery.getFarmer().getId(),
                delivery.getFarmer().getUser().getFullName(),
                delivery.getFarmer().getFarmerCode(),
                delivery.getDeliveredAt(),
                delivery.getReceivedByUser().getId(),
                delivery.getReceivedByUser().getFullName(),
                delivery.getStatus(),
                delivery.getNotes(),
                total,
                delivery.getItems().stream().map(SupplyDeliveryItemResponse::fromEntity).toList()
        );
    }
}
