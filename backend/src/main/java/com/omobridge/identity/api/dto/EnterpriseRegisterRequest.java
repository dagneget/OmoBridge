package com.omobridge.identity.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record EnterpriseRegisterRequest(
    @NotBlank(message = "Owner phone number is required")
    String phoneNumber,

    @Email(message = "Invalid email format")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    String password,

    @NotBlank(message = "Owner full name is required")
    String fullName,

    String preferredLanguage,

    @NotBlank(message = "Enterprise name is required")
    String enterpriseName,

    String registrationNumber,

    String contactPhone,

    String contactEmail,

    @NotBlank(message = "Woreda is required")
    String locationWoreda,

    @NotBlank(message = "Town is required")
    String locationTown,

    String locationAddress,

    BigDecimal latitude,

    BigDecimal longitude
) {}
