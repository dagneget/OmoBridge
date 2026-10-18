package com.omobridge.orders.api.dto;

import com.omobridge.orders.domain.OrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderDetailResponse(
        UUID orderId,
        String orderNo,
        UUID checkoutGroupId,
        String checkoutGroupNo,
        UUID enterpriseId,
        String enterpriseName,
        UUID buyerId,
        String buyerName,
        String buyerPhone,
        OrderStatus status,
        BigDecimal subtotal,
        BigDecimal tax,
        BigDecimal platformFee,
        BigDecimal deliveryFee,
        BigDecimal totalAmount,
        String currency,
        String deliveryAddress,
        String deliveryPhone,
        Double deliveryLatitude,
        Double deliveryLongitude,
        String notes,
        List<OrderItemResponse> items,
        List<OrderStatusHistoryResponse> statusHistories,
        Instant createdAt
) {}
