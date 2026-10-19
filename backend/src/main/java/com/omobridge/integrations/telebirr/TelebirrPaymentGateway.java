package com.omobridge.integrations.telebirr;

import com.omobridge.payments.service.PaymentGateway;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class TelebirrPaymentGateway implements PaymentGateway {

    private final AtomicBoolean simulateFailure = new AtomicBoolean(false);

    public void setSimulateFailure(boolean fail) {
        this.simulateFailure.set(fail);
    }

    @Override
    public GatewayResponse charge(ChargeRequest request) {
        log.info("Processing Telebirr mock charge for order [{}] amount [{} {}] phone [{}]",
                request.orderId(), request.amount(), request.currency(), request.customerPhone());

        if (simulateFailure.get()) {
            log.warn("Telebirr charge simulated failure triggered for order [{}]", request.orderId());
            return GatewayResponse.failed("Telebirr network error: transaction simulated failure");
        }

        String transactionId = "TB-TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return GatewayResponse.successful(transactionId, "COMPLETED");
    }

    @Override
    public GatewayResponse payout(PayoutRequest request) {
        log.info("Processing Telebirr mock farmer payout [{}] amount [{} {}] recipient [{}]",
                request.payoutId(), request.amount(), request.currency(), request.recipientPhone());

        if (simulateFailure.get()) {
            log.warn("Telebirr payout simulated failure triggered for payout [{}]", request.payoutId());
            return GatewayResponse.failed("Telebirr payout failed: insufficient float or recipient unverified");
        }

        String transactionId = "TB-PAYOUT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return GatewayResponse.successful(transactionId, "COMPLETED");
    }

    @Override
    public GatewayResponse checkStatus(String transactionId) {
        log.info("Checking Telebirr transaction status for [{}]", transactionId);
        return GatewayResponse.successful(transactionId, "COMPLETED");
    }
}
