package com.omobridge.inventory.api.dto;

import com.omobridge.inventory.domain.InventoryLocation;
import java.time.Instant;
import java.util.UUID;

public record InventoryLocationResponse(
        UUID id,
        UUID enterpriseId,
        String name,
        String locationType,
        String description,
        Instant createdAt
) {
    public static InventoryLocationResponse fromEntity(InventoryLocation loc) {
        return new InventoryLocationResponse(
                loc.getId(),
                loc.getEnterprise().getId(),
                loc.getName(),
                loc.getLocationType(),
                loc.getDescription(),
                loc.getCreatedAt()
        );
    }
}
