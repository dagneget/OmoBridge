package com.omobridge.identity.api.dto;

public record AuthResponse(
    String accessToken,
    String tokenType,
    long expiresInSeconds,
    UserProfileResponse user
) {}
