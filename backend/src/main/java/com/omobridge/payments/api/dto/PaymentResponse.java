package com.omobridge.payments.api.dto;

import com.omobridge.payments.domain.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentResponse(
        UUID paymentId,
        String paymentNo,
        UUID orderId,
        String orderNo,
        UUID bookingId,
        String bookingCode,
        BigDecimal amount,
        String currency,
        PaymentStatus status,
        Instant createdAt
) {}
