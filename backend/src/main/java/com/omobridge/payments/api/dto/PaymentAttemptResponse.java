package com.omobridge.payments.api.dto;

import com.omobridge.payments.domain.PaymentAttemptStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentAttemptResponse(
        UUID attemptId,
        UUID paymentId,
        String paymentNo,
        String idempotencyKey,
        String provider,
        String providerReference,
        BigDecimal amount,
        String currency,
        PaymentAttemptStatus status,
        Instant createdAt
) {}
