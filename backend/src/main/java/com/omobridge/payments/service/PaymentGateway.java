package com.omobridge.payments.service;

import java.math.BigDecimal;

public interface PaymentGateway {

    record ChargeRequest(
            String orderId,
            BigDecimal amount,
            String currency,
            String customerPhone,
            String description
    ) {}

    record PayoutRequest(
            String payoutId,
            BigDecimal amount,
            String currency,
            String recipientPhone,
            String description
    ) {}

    record GatewayResponse(
            boolean success,
            String transactionId,
            String status, // "COMPLETED", "PENDING", "FAILED"
            String rawResponse,
            String errorMessage
    ) {
        public static GatewayResponse successful(String transactionId, String status) {
            return new GatewayResponse(true, transactionId, status, "{\"status\":\"SUCCESS\"}", null);
        }

        public static GatewayResponse failed(String errorMessage) {
            return new GatewayResponse(false, null, "FAILED", "{\"status\":\"FAILED\"}", errorMessage);
        }
    }

    GatewayResponse charge(ChargeRequest request);

    GatewayResponse payout(PayoutRequest request);

    GatewayResponse checkStatus(String transactionId);
}
