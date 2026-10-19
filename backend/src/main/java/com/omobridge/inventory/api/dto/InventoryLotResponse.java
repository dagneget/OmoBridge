package com.omobridge.inventory.api.dto;

import com.omobridge.inventory.domain.InventoryLot;
import com.omobridge.inventory.domain.LotStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InventoryLotResponse(
        UUID id,
        String lotCode,
        UUID enterpriseId,
        UUID locationId,
        String locationName,
        UUID productTypeId,
        String productTypeName,
        UUID sourceDeliveryItemId,
        String grade,
        BigDecimal receivedQty,
        BigDecimal balanceQty,
        String unit,
        LotStatus status,
        Instant receivedAt,
        Instant createdAt
) {
    public static InventoryLotResponse fromEntity(InventoryLot lot) {
        return new InventoryLotResponse(
                lot.getId(),
                lot.getLotCode(),
                lot.getEnterprise().getId(),
                lot.getLocation().getId(),
                lot.getLocation().getName(),
                lot.getProductType().getId(),
                lot.getProductType().getName(),
                lot.getSourceDeliveryItem() != null ? lot.getSourceDeliveryItem().getId() : null,
                lot.getGrade(),
                lot.getReceivedQty(),
                lot.getBalanceQty(),
                lot.getUnit(),
                lot.getStatus(),
                lot.getReceivedAt(),
                lot.getCreatedAt()
        );
    }
}
