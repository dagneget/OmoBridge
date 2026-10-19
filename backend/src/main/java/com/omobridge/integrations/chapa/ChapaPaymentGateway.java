package com.omobridge.integrations.chapa;

import com.omobridge.payments.service.PaymentGateway;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class ChapaPaymentGateway implements PaymentGateway {

    private final AtomicBoolean simulateFailure = new AtomicBoolean(false);

    public void setSimulateFailure(boolean fail) {
        this.simulateFailure.set(fail);
    }

    @Override
    public GatewayResponse charge(ChargeRequest request) {
        log.info("Processing Chapa demo charge for order [{}] amount [{} {}] phone [{}]",
                request.orderId(), request.amount(), request.currency(), request.customerPhone());

        if (simulateFailure.get()) {
            log.warn("Chapa charge simulated failure triggered for order [{}]", request.orderId());
            return GatewayResponse.failed("Chapa network error: transaction simulated failure");
        }

        String transactionId = "CHAPA-TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("Chapa demo charge approved [{}] for order [{}]", transactionId, request.orderId());
        return GatewayResponse.successful(transactionId, "COMPLETED");
    }

    @Override
    public GatewayResponse payout(PayoutRequest request) {
        log.info("Processing Chapa demo farmer payout [{}] amount [{} {}] recipient [{}]",
                request.payoutId(), request.amount(), request.currency(), request.recipientPhone());

        if (simulateFailure.get()) {
            log.warn("Chapa payout simulated failure triggered for payout [{}]", request.payoutId());
            return GatewayResponse.failed("Chapa payout failed: insufficient float or recipient unverified");
        }

        String transactionId = "CHAPA-PAYOUT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("Chapa demo payout approved [{}] for payout [{}]", transactionId, request.payoutId());
        return GatewayResponse.successful(transactionId, "COMPLETED");
    }

    @Override
    public GatewayResponse checkStatus(String transactionId) {
        log.info("Checking Chapa demo transaction status for [{}]", transactionId);
        return GatewayResponse.successful(transactionId, "COMPLETED");
    }
}
