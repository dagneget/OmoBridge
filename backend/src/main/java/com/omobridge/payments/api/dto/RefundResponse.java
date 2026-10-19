package com.omobridge.payments.api.dto;

import com.omobridge.payments.domain.RefundStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RefundResponse(
        UUID refundId,
        String refundNo,
        UUID paymentId,
        BigDecimal amount,
        String currency,
        RefundStatus status,
        String reason,
        Instant createdAt
) {}
