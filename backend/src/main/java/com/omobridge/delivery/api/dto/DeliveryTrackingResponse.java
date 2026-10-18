package com.omobridge.delivery.api.dto;

import com.omobridge.delivery.domain.DeliveryStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DeliveryTrackingResponse(
        UUID jobId,
        String jobNo,
        DeliveryStatus status,
        Double currentLatitude,
        Double currentLongitude,
        Double speed,
        Instant lastRecordedAt,
        List<LocationPointResponse> history
) {}
