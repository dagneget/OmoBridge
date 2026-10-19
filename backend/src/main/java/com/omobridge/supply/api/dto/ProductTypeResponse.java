package com.omobridge.supply.api.dto;

import com.omobridge.supply.domain.ProductType;
import java.util.UUID;

public record ProductTypeResponse(
        UUID id,
        String code,
        String name,
        String category,
        String unit,
        String description
) {
    public static ProductTypeResponse fromEntity(ProductType pt) {
        return new ProductTypeResponse(
                pt.getId(),
                pt.getCode(),
                pt.getName(),
                pt.getCategory(),
                pt.getUnit(),
                pt.getDescription()
        );
    }
}
