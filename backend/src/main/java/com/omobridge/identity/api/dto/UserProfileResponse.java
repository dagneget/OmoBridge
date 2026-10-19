package com.omobridge.identity.api.dto;

import com.omobridge.identity.domain.UserStatus;
import com.omobridge.identity.domain.VerificationStatus;
import java.util.Set;
import java.util.UUID;

public record UserProfileResponse(
    UUID id,
    String phoneNumber,
    String email,
    String fullName,
    UserStatus status,
    String preferredLanguage,
    Set<String> roles,
    UUID enterpriseId,
    String enterpriseName,
    String farmerCode,
    VerificationStatus verificationStatus
) {}
