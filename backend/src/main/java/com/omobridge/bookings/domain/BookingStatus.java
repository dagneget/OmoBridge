package com.omobridge.bookings.domain;

public enum BookingStatus {
    REQUESTED,
    CONFIRMED,
    PAID,
    COMPLETED,
    DECLINED,
    CANCELLED;

    public boolean canTransitionTo(BookingStatus target) {
        if (this == target) return false;
        return switch (this) {
            case REQUESTED -> target == CONFIRMED || target == DECLINED || target == CANCELLED;
            case CONFIRMED -> target == PAID || target == CANCELLED;
            case PAID -> target == COMPLETED || target == CANCELLED;
            case COMPLETED, DECLINED, CANCELLED -> false; // Terminal states
        };
    }
}
