package com.omobridge.tourism.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TourPackageResponse(
    UUID id,
    UUID enterpriseId,
    String enterpriseName,
    String name,
    String category,
    String overview,
    String story,
    String locationText,
    BigDecimal latitude,
    BigDecimal longitude,
    String directions,
    String openingHours,
    BigDecimal durationHours,
    int maxGroupSize,
    BigDecimal priceAmount,
    String priceUnit,
    String currency,
    String culturalRules,
    String safetyNotes,
    String communityApprovalRef,
    LocalDate communityApprovalDate,
    boolean isActive
) {}
