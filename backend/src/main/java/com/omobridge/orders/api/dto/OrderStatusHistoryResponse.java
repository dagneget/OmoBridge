package com.omobridge.orders.api.dto;

import com.omobridge.orders.domain.OrderStatus;
import java.time.Instant;
import java.util.UUID;

public record OrderStatusHistoryResponse(
        UUID id,
        OrderStatus fromStatus,
        OrderStatus toStatus,
        String changedBy,
        String reason,
        Instant createdAt
) {}
