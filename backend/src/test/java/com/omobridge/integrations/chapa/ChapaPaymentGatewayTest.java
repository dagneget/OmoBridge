package com.omobridge.integrations.chapa;

import static org.assertj.core.api.Assertions.assertThat;

import com.omobridge.payments.service.PaymentGateway;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ChapaPaymentGatewayTest {

    private ChapaPaymentGateway gateway;

    @BeforeEach
    void setUp() {
        gateway = new ChapaPaymentGateway();
    }

    @Test
    @DisplayName("charge returns successful response with CHAPA-TXN prefix")
    void chargeSuccess() {
        PaymentGateway.ChargeRequest request = new PaymentGateway.ChargeRequest(
                "ORD-9911",
                new BigDecimal("500.00"),
                "ETB",
                "+251911223344",
                "Order payment test"
        );

        PaymentGateway.GatewayResponse response = gateway.charge(request);

        assertThat(response.success()).isTrue();
        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.transactionId()).startsWith("CHAPA-TXN-");
        assertThat(response.errorMessage()).isNull();
    }

    @Test
    @DisplayName("charge returns failed response when simulateFailure is true")
    void chargeFailure() {
        gateway.setSimulateFailure(true);
        PaymentGateway.ChargeRequest request = new PaymentGateway.ChargeRequest(
                "ORD-9911",
                new BigDecimal("500.00"),
                "ETB",
                "+251911223344",
                "Order payment test"
        );

        PaymentGateway.GatewayResponse response = gateway.charge(request);

        assertThat(response.success()).isFalse();
        assertThat(response.status()).isEqualTo("FAILED");
        assertThat(response.errorMessage()).contains("simulated failure");
    }

    @Test
    @DisplayName("payout returns successful response with CHAPA-PAYOUT prefix")
    void payoutSuccess() {
        PaymentGateway.PayoutRequest request = new PaymentGateway.PayoutRequest(
                "PAYOUT-11",
                new BigDecimal("250.00"),
                "ETB",
                "+251922334455",
                "Farmer payout test"
        );

        PaymentGateway.GatewayResponse response = gateway.payout(request);

        assertThat(response.success()).isTrue();
        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.transactionId()).startsWith("CHAPA-PAYOUT-");
    }

    @Test
    @DisplayName("checkStatus returns completed response")
    void checkStatusSuccess() {
        PaymentGateway.GatewayResponse response = gateway.checkStatus("CHAPA-TXN-ABC12345");

        assertThat(response.success()).isTrue();
        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.transactionId()).isEqualTo("CHAPA-TXN-ABC12345");
    }
}
