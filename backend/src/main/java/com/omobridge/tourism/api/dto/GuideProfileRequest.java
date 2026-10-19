package com.omobridge.tourism.api.dto;

import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.util.List;

public record GuideProfileRequest(
        String bio,
        List<String> languages,
        String specialties,
        @DecimalMin(value = "0.0", message = "Daily rate must be non-negative")
        BigDecimal dailyRate,
        Boolean isAvailable
) {}
