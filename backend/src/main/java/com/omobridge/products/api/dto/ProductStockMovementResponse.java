package com.omobridge.products.api.dto;

import com.omobridge.products.domain.ProductStockMovement;
import com.omobridge.products.domain.ProductStockMovementType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProductStockMovementResponse(
        UUID id,
        UUID productId,
        ProductStockMovementType movementType,
        BigDecimal quantity,
        BigDecimal stockAfter,
        String reason,
        Instant createdAt
) {
    public static ProductStockMovementResponse fromEntity(ProductStockMovement m) {
        return new ProductStockMovementResponse(
                m.getId(),
                m.getProduct().getId(),
                m.getMovementType(),
                m.getQuantity(),
                m.getStockAfter(),
                m.getReason(),
                m.getCreatedAt()
        );
    }
}
