package com.omobridge.reviews.api.dto;

import com.omobridge.reviews.domain.ReviewTargetType;
import java.util.List;
import java.util.UUID;

public record ReviewSummaryResponse(
        ReviewTargetType targetType,
        UUID targetId,
        double averageRating,
        long totalReviews,
        List<ReviewResponse> reviews
) {}
