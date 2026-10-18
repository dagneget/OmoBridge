package com.omobridge.tourism.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record TourPackageRequest(
    @NotBlank(message = "Package name is required")
    String name,

    @NotBlank(message = "Category is required")
    String category,

    @NotBlank(message = "Overview is required")
    String overview,

    String story,

    @NotBlank(message = "Location is required")
    String locationText,

    BigDecimal latitude,

    BigDecimal longitude,

    String directions,

    String openingHours,

    BigDecimal durationHours,

    @Min(value = 1, message = "Max group size must be at least 1")
    int maxGroupSize,

    @NotNull(message = "Price amount is required")
    @DecimalMin(value = "0.00", message = "Price cannot be negative")
    BigDecimal priceAmount,

    String priceUnit,

    String currency,

    String culturalRules,

    String safetyNotes,

    String communityApprovalRef,

    LocalDate communityApprovalDate,

    Boolean isActive
) {}
