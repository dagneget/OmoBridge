package com.omobridge.identity.api.dto;

import com.omobridge.identity.domain.VerificationStatus;
import java.util.UUID;

public record FarmerResponse(
    UUID id,
    UUID userId,
    UUID enterpriseId,
    String farmerCode,
    String fullName,
    String phoneNumber,
    String village,
    String kebele,
    VerificationStatus verificationStatus
) {}
