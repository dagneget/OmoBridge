package com.omobridge.tourism.api.dto;

import com.omobridge.identity.domain.Guide;
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
        String bio,
        List<String> languages,
        String specialties,
        BigDecimal dailyRate,
        String currency,
        VerificationStatus verificationStatus,
        boolean isAvailable
) {
    public static GuideResponse fromEntity(Guide guide) {
        return new GuideResponse(
                guide.getId(),
                guide.getUser().getId(),
                guide.getUser().getFullName(),
                guide.getUser().getPhoneNumber(),
                guide.getLicenseNumber(),
                guide.getBio(),
                guide.getLanguages(),
                guide.getSpecialties(),
                guide.getDailyRate(),
                guide.getCurrency(),
                guide.getVerificationStatus(),
                guide.isAvailable()
        );
    }
}
