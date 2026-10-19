package com.omobridge.payments.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record CreatePaymentAttemptRequest(
        UUID orderId,
        UUID bookingId,
        @NotBlank(message = "Payment provider is required")
        String provider,
        @NotBlank(message = "Idempotency key is required")
        String idempotencyKey
) {}
