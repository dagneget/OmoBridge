package com.omobridge.inventory.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record InventoryAdjustmentRequest(
        @NotNull BigDecimal quantity,
        @NotBlank String reason
) {}
