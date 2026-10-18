package com.omobridge.inventory.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InventoryLocationRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 50) String locationType,
        String description
) {}
