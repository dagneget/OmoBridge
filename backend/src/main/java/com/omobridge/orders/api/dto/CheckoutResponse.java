package com.omobridge.orders.api.dto;

import com.omobridge.orders.domain.CheckoutGroupStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CheckoutResponse(
        UUID checkoutGroupId,
        String groupNo,
        CheckoutGroupStatus status,
        BigDecimal totalAmount,
        String currency,
        List<OrderSummaryResponse> orders
) {}
