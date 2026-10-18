package com.omobridge.common.util;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CodeGeneratorTest {

    private CodeGenerator codeGenerator;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(Instant.parse("2026-10-18T12:00:00Z"), ZoneId.of("UTC"));
        codeGenerator = new CodeGenerator(fixedClock);
    }

    @Test
    @DisplayName("Should generate valid receipt number format")
    void shouldGenerateValidReceiptNumber() {
        String receipt = codeGenerator.generateReceiptNumber();
        assertThat(receipt).startsWith("REC-20261018-");
        assertThat(receipt).hasSize(17);
    }

    @Test
    @DisplayName("Should generate valid order number format")
    void shouldGenerateValidOrderNumber() {
        String order = codeGenerator.generateOrderNumber();
        assertThat(order).startsWith("ORD-20261018-");
        assertThat(order).hasSize(17);
    }

    @Test
    @DisplayName("Should generate valid booking code format")
    void shouldGenerateValidBookingCode() {
        String booking = codeGenerator.generateBookingCode();
        assertThat(booking).startsWith("BKG-20261018-");
        assertThat(booking).hasSize(17);
    }

    @Test
    @DisplayName("Should generate valid batch code format")
    void shouldGenerateValidBatchCode() {
        String batch = codeGenerator.generateBatchCode();
        assertThat(batch).startsWith("BAT-20261018-");
        assertThat(batch).hasSize(17);
    }

    @Test
    @DisplayName("Should generate valid farmer code format")
    void shouldGenerateValidFarmerCode() {
        String farmer = codeGenerator.generateFarmerCode();
        assertThat(farmer).startsWith("FRM-");
        assertThat(farmer).hasSize(10);
    }

    @Test
    @DisplayName("Should generate unique numbers across invocations")
    void shouldGenerateUniqueNumbers() {
        String code1 = codeGenerator.generateReceiptNumber();
        String code2 = codeGenerator.generateReceiptNumber();
        assertThat(code1).isNotEqualTo(code2);
    }
}
