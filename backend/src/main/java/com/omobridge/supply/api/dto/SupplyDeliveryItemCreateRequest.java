package com.omobridge.supply.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record SupplyDeliveryItemCreateRequest(
        @NotNull(message = "Product type ID is required")
        UUID productTypeId,
        @NotBlank(message = "Grade is required")
        String grade,
        @NotNull(message = "Delivered quantity is required")
        @DecimalMin(value = "0.01", message = "Delivered quantity must be greater than zero")
        BigDecimal deliveredQty
) {}
