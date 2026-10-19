package com.omobridge.orders.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemResponse(
        UUID id,
        UUID productId,
        String productName,
        String productSku,
        BigDecimal unitPrice,
        BigDecimal quantity,
        BigDecimal lineTotal,
        UUID batchId
) {}
