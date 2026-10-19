package com.omobridge.common.util;

import com.omobridge.common.exception.BusinessRuleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PhoneNumberUtilTest {

    @ParameterizedTest
    @ValueSource(strings = {
        "0911223344",
        "0911 22 33 44",
        "0911-22-33-44",
        "+251911223344",
        "+251 911 22 33 44",
        "251911223344",
        "00251911223344",
        "911223344"
    })
    @DisplayName("Should normalize various local and international 09-prefixed phone numbers to +251911223344")
    void shouldNormalizeEthioTelecomNumbers(String raw) {
        String normalized = PhoneNumberUtil.normalize(raw);
        assertThat(normalized).isEqualTo("+251911223344");
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "0711223344",
        "+251711223344",
        "711223344",
        "+251 711 22 33 44"
    })
    @DisplayName("Should normalize Safaricom 07-prefixed phone numbers to +251711223344")
    void shouldNormalizeSafaricomNumbers(String raw) {
        String normalized = PhoneNumberUtil.normalize(raw);
        assertThat(normalized).isEqualTo("+251711223344");
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "",
        "   ",
        "12345",
        "0811223344",
        "+254711223344", // Kenya
        "+14155552671", // US
        "09112233445", // too long
        "091122334", // too short
        "abcdefghij"
    })
    @DisplayName("Should reject invalid phone numbers with BusinessRuleException")
    void shouldRejectInvalidNumbers(String invalid) {
        assertThatThrownBy(() -> PhoneNumberUtil.normalize(invalid))
                .isInstanceOf(BusinessRuleException.class);
    }
}
