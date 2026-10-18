package com.omobridge.identity.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record ProducerRegisterRequest(
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

    UUID enterpriseId,

    @NotBlank(message = "Village is required")
    String village,

    String kebele,

    String idCardNumber,

    String telebirrPhone,

    String bankName,

    String bankAccountNumber,

    Boolean consentPublicName
) {}
