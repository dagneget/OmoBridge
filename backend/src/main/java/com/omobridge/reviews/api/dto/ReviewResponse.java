package com.omobridge.reviews.api.dto;

import com.omobridge.reviews.domain.ReviewTargetType;
import java.time.Instant;
import java.util.UUID;

public record ReviewResponse(
        UUID id,
        UUID reviewerUserId,
        String reviewerName,
        ReviewTargetType targetType,
        UUID targetId,
        int rating,
        String comment,
        Instant createdAt
) {}
