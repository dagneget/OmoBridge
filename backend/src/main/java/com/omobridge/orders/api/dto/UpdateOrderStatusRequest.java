package com.omobridge.orders.api.dto;

import com.omobridge.orders.domain.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateOrderStatusRequest(
        @NotNull(message = "New status is required")
        OrderStatus newStatus,
        String reason
) {}
