package com.omobridge.inventory.api.dto;

import com.omobridge.inventory.domain.InventoryMovement;
import com.omobridge.inventory.domain.MovementType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InventoryMovementResponse(
        UUID id,
        UUID lotId,
        MovementType movementType,
        BigDecimal quantity,
        BigDecimal balanceAfter,
        String reason,
        String referenceType,
        UUID referenceId,
        UUID createdByUserId,
        Instant createdAt
) {
    public static InventoryMovementResponse fromEntity(InventoryMovement m) {
        return new InventoryMovementResponse(
                m.getId(),
                m.getLot().getId(),
                m.getMovementType(),
                m.getQuantity(),
                m.getBalanceAfter(),
                m.getReason(),
                m.getReferenceType(),
                m.getReferenceId(),
                m.getCreatedByUser() != null ? m.getCreatedByUser().getId() : null,
                m.getCreatedAt()
        );
    }
}
