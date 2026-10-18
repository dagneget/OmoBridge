package com.omobridge.orders.api.dto;

import com.omobridge.orders.domain.OrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OrderSummaryResponse(
        UUID orderId,
        String orderNo,
        UUID enterpriseId,
        String enterpriseName,
        OrderStatus status,
        BigDecimal subtotal,
        BigDecimal tax,
        BigDecimal platformFee,
        BigDecimal deliveryFee,
        BigDecimal totalAmount,
        String currency,
        int itemCount,
        Instant createdAt
) {}
