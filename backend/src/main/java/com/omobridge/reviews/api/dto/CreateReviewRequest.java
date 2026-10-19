package com.omobridge.reviews.api.dto;

import com.omobridge.reviews.domain.ReviewTargetType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateReviewRequest(
        @NotNull(message = "Target type is required")
        ReviewTargetType targetType,

        @NotNull(message = "Target ID is required")
        UUID targetId,

        UUID orderId,

        UUID bookingId,

        @Min(value = 1, message = "Rating must be at least 1")
        @Max(value = 5, message = "Rating must be at most 5")
        int rating,

        String comment
) {}
