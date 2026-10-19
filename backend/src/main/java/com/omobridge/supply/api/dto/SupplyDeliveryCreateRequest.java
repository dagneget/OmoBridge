package com.omobridge.supply.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SupplyDeliveryCreateRequest(
        @NotNull(message = "Enterprise ID is required")
        UUID enterpriseId,
        @NotNull(message = "Farmer ID is required")
        UUID farmerId,
        Instant deliveredAt,
        String notes,
        @NotEmpty(message = "Delivery must contain at least one item")
        @Valid
        List<SupplyDeliveryItemCreateRequest> items
) {}
