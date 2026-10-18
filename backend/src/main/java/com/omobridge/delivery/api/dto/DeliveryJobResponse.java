package com.omobridge.delivery.api.dto;

import com.omobridge.delivery.domain.DeliveryStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DeliveryJobResponse(
        UUID jobId,
        String jobNo,
        UUID providerId,
        String providerName,
        DeliveryStatus status,
        String pickupAddress,
        String dropoffAddress,
        BigDecimal fee,
        String currency,
        String trackingToken,
        List<UUID> orderIds,
        Instant pickedUpAt,
        Instant deliveredAt,
        Instant createdAt
) {}
