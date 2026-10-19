package com.omobridge.orders.domain;

public enum OrderStatus {
    PLACED,
    PAID,
    PACKED,
    IN_TRANSIT,
    DELIVERED,
    CANCELLED;

    public boolean canTransitionTo(OrderStatus target) {
        if (this == target) return false;
        return switch (this) {
            case PLACED -> target == PAID || target == CANCELLED;
            case PAID -> target == PACKED || target == IN_TRANSIT || target == CANCELLED;
            case PACKED -> target == IN_TRANSIT || target == CANCELLED;
            case IN_TRANSIT -> target == DELIVERED || target == CANCELLED;
            case DELIVERED, CANCELLED -> false;
        };
    }
}
