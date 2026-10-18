package com.omobridge.common.security;

public enum RoleName {
    BUYER_VISITOR,
    PRODUCER_FARMER,
    MICRO_ENTERPRISE,
    DELIVERY_PROVIDER,
    TOUR_GUIDE,
    TOURISM_AUTHORITY,
    SYSTEM_ADMIN;

    public String withRolePrefix() {
        return "ROLE_" + this.name();
    }
}
