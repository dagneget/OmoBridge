package com.omobridge.identity.api.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    String identifier,
    String phoneNumber,
    @NotBlank(message = "Password is required")
    String password
) {
    public String getResolvedIdentifier() {
        if (phoneNumber != null && !phoneNumber.isBlank()) {
            return phoneNumber.trim();
        }
        return identifier != null ? identifier.trim() : "";
    }
}
