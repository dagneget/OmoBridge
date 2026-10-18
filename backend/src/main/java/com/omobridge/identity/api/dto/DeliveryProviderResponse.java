package com.omobridge.identity.api.dto;

import com.omobridge.identity.domain.VehicleType;
import com.omobridge.identity.domain.VerificationStatus;
import java.util.UUID;

public record DeliveryProviderResponse(
    UUID id,
    UUID userId,
    String fullName,
    String phoneNumber,
    VehicleType vehicleType,
    String vehiclePlateNumber,
    VerificationStatus verificationStatus,
    boolean isAvailable
) {}
