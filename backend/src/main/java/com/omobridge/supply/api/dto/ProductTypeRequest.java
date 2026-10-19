package com.omobridge.supply.api.dto;

import com.omobridge.supply.domain.ProductType;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record ProductTypeRequest(
        @NotBlank(message = "Code is required")
        String code,
        @NotBlank(message = "Name is required")
        String name,
        @NotBlank(message = "Category is required")
        String category,
        @NotBlank(message = "Unit is required")
        String unit,
        String description
) {
    public ProductType toEntity() {
        ProductType pt = new ProductType();
        pt.setCode(this.code());
        pt.setName(this.name());
        pt.setCategory(this.category());
        pt.setUnit(this.unit());
        pt.setDescription(this.description());
        return pt;
    }
}
