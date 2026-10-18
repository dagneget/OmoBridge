package com.omobridge.delivery.domain;

public enum DeliveryStatus {
    PENDING,
    ASSIGNED,
    PICKED_UP,
    IN_TRANSIT,
    DELIVERED,
    FAILED,
    CANCELLED;

    public boolean canTransitionTo(DeliveryStatus target) {
        if (this == target) return false;
        return switch (this) {
            case PENDING -> target == ASSIGNED || target == CANCELLED;
            case ASSIGNED -> target == PICKED_UP || target == CANCELLED || target == FAILED;
            case PICKED_UP -> target == IN_TRANSIT || target == FAILED || target == CANCELLED;
            case IN_TRANSIT -> target == DELIVERED || target == FAILED || target == CANCELLED;
            case DELIVERED, FAILED, CANCELLED -> false;
        };
    }
}
