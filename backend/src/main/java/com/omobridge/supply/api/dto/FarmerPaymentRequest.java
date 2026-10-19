package com.omobridge.supply.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record FarmerPaymentRequest(
        @NotNull(message = "Enterprise ID is required")
        UUID enterpriseId,
        @NotNull(message = "Farmer ID is required")
        UUID farmerId,
        @NotNull(message = "Payment amount is required")
        @DecimalMin(value = "0.01", message = "Payment amount must be greater than zero")
        BigDecimal amount,
        @NotBlank(message = "Payment method is required")
        String paymentMethod
) {}
