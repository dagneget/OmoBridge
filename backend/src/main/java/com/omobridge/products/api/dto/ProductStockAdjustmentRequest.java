package com.omobridge.products.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ProductStockAdjustmentRequest(
        @NotNull BigDecimal quantity,
        @NotBlank String reason
) {}
