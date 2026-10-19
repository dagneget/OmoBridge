package com.omobridge.delivery.api.dto;

import com.omobridge.delivery.domain.DeliveryStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateDeliveryJobStatusRequest(
        @NotNull(message = "New delivery status is required")
        DeliveryStatus newStatus,
        String reason
) {}
