package com.omobridge.identity.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record GuideRegisterRequest(
    @NotBlank(message = "Phone number is required")
    String phoneNumber,

    @Email(message = "Invalid email format")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    String password,

    @NotBlank(message = "Full name is required")
    String fullName,

    String preferredLanguage,

    String licenseNumber,

    String bio,

    List<String> languages,

    String specialties,

    BigDecimal dailyRate,

    String currency
) {}
