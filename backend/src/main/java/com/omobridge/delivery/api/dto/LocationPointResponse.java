package com.omobridge.delivery.api.dto;

import java.time.Instant;

public record LocationPointResponse(
        Double latitude,
        Double longitude,
        Double speed,
        Instant recordedAt,
        Instant receivedAt
) {}
