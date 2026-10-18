package com.omobridge.supply.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record SupplyDeliveryInspectionItemRequest(
        @NotNull(message = "Delivery item ID is required")
        UUID deliveryItemId,
        @NotNull(message = "Accepted quantity is required")
        @DecimalMin(value = "0.0", message = "Accepted quantity must be non-negative")
        BigDecimal acceptedQty,
        @NotNull(message = "Rejected quantity is required")
        @DecimalMin(value = "0.0", message = "Rejected quantity must be non-negative")
        BigDecimal rejectedQty,
        String rejectionReason
) {}
