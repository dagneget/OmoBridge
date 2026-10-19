package com.omobridge.delivery.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateDeliveryJobRequest(
        @NotEmpty(message = "Order IDs must not be empty")
        List<UUID> orderIds,
        UUID providerId,
        @NotBlank(message = "Pickup address is required")
        String pickupAddress,
        Double pickupLatitude,
        Double pickupLongitude,
        @NotBlank(message = "Drop-off address is required")
        String dropoffAddress,
        Double dropoffLatitude,
        Double dropoffLongitude,
        @NotNull(message = "Delivery fee is required")
        @DecimalMin(value = "0.00", message = "Delivery fee must be non-negative")
        BigDecimal fee
) {}
