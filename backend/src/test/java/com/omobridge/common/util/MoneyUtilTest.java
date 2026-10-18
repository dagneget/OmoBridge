package com.omobridge.common.util;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MoneyUtilTest {

    @Test
    @DisplayName("Should round money correctly to 2 decimal places")
    void shouldRoundMoneyCorrectly() {
        BigDecimal unrounded = new BigDecimal("123.456");
        BigDecimal rounded = MoneyUtil.roundMoney(unrounded);
        assertThat(rounded).isEqualByComparingTo("123.46");
        assertThat(rounded.scale()).isEqualTo(2);
    }

    @Test
    @DisplayName("Should round quantity correctly to 3 decimal places")
    void shouldRoundQuantityCorrectly() {
        BigDecimal unrounded = new BigDecimal("45.6789");
        BigDecimal rounded = MoneyUtil.roundQuantity(unrounded);
        assertThat(rounded).isEqualByComparingTo("45.679");
        assertThat(rounded.scale()).isEqualTo(3);
    }

    @Test
    @DisplayName("Should accurately multiply unit price and quantity")
    void shouldMultiplyAccurately() {
        BigDecimal unitPrice = new BigDecimal("350.50");
        BigDecimal quantity = new BigDecimal("2.500");
        BigDecimal total = MoneyUtil.multiply(unitPrice, quantity);
        assertThat(total).isEqualByComparingTo("876.25");
        assertThat(total.scale()).isEqualTo(2);
    }

    @Test
    @DisplayName("Should handle null values gracefully")
    void shouldHandleNullValues() {
        assertThat(MoneyUtil.roundMoney(null)).isEqualByComparingTo("0.00");
        assertThat(MoneyUtil.roundQuantity(null)).isEqualByComparingTo("0.000");
        assertThat(MoneyUtil.multiply(null, null)).isEqualByComparingTo("0.00");
    }
}
