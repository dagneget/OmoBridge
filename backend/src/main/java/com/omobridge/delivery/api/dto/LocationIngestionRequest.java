package com.omobridge.delivery.api.dto;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record LocationIngestionRequest(
        @NotNull(message = "Latitude is required")
        Double latitude,
        @NotNull(message = "Longitude is required")
        Double longitude,
        Double speed,
        @NotNull(message = "Recorded timestamp is required")
        Instant recordedAt
) {}
