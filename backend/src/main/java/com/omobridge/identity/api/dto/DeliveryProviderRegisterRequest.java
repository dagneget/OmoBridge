package com.omobridge.identity.api.dto;

import com.omobridge.identity.domain.VehicleType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DeliveryProviderRegisterRequest(
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

    @NotNull(message = "Vehicle type is required")
    VehicleType vehicleType,

    String vehiclePlateNumber,

    String licenseNumber,

    String serviceArea
) {}
