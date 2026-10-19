package com.omobridge.bookings.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class BookingStatusTest {

    @ParameterizedTest(name = "{0} -> {1} should be {2}")
    @CsvSource({
            "REQUESTED, CONFIRMED, true",
            "REQUESTED, DECLINED, true",
            "REQUESTED, CANCELLED, true",
            "REQUESTED, PAID, false",
            "REQUESTED, COMPLETED, false",
            "REQUESTED, REQUESTED, false",

            "CONFIRMED, PAID, true",
            "CONFIRMED, CANCELLED, true",
            "CONFIRMED, COMPLETED, false",
            "CONFIRMED, DECLINED, false",
            "CONFIRMED, REQUESTED, false",

            "PAID, COMPLETED, true",
            "PAID, CANCELLED, true",
            "PAID, CONFIRMED, false",
            "PAID, DECLINED, false",

            "COMPLETED, CANCELLED, false",
            "COMPLETED, REQUESTED, false",
            "DECLINED, REQUESTED, false",
            "DECLINED, CONFIRMED, false",
            "CANCELLED, REQUESTED, false",
            "CANCELLED, PAID, false"
    })
    @DisplayName("Validate booking status transition matrix")
    void testStatusTransitions(BookingStatus from, BookingStatus to, boolean expected) {
        assertThat(from.canTransitionTo(to)).isEqualTo(expected);
    }

    @Test
    @DisplayName("Terminal states have no allowed transitions")
    void testTerminalStates() {
        for (BookingStatus target : BookingStatus.values()) {
            assertThat(BookingStatus.COMPLETED.canTransitionTo(target)).isFalse();
            assertThat(BookingStatus.DECLINED.canTransitionTo(target)).isFalse();
            assertThat(BookingStatus.CANCELLED.canTransitionTo(target)).isFalse();
        }
    }
}
