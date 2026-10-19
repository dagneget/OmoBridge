package com.omobridge.identity.api.dto;

import com.omobridge.identity.domain.VerificationStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record GuideResponse(
    UUID id,
    UUID userId,
    String fullName,
    String phoneNumber,
    String licenseNumber,
    List<String> languages,
    BigDecimal dailyRate,
    String currency,
    VerificationStatus verificationStatus,
    boolean isAvailable
) {}
