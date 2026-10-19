package com.omobridge.supply.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record BuyingPriceRequest(
        @NotNull(message = "Enterprise ID is required")
        UUID enterpriseId,
        @NotNull(message = "Product type ID is required")
        UUID productTypeId,
        @NotBlank(message = "Grade is required")
        String grade,
        @NotNull(message = "Price per unit is required")
        @DecimalMin(value = "0.0", message = "Price must be non-negative")
        BigDecimal pricePerUnit,
        Instant effectiveFrom,
        Instant effectiveTo
) {}
