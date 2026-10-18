package com.omobridge.reviews.api;

import com.omobridge.common.exception.UnauthorizedException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.reviews.api.dto.CreateReviewRequest;
import com.omobridge.reviews.api.dto.ReviewResponse;
import com.omobridge.reviews.api.dto.ReviewSummaryResponse;
import com.omobridge.reviews.domain.ReviewTargetType;
import com.omobridge.reviews.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reviews")
@RequiredArgsConstructor
@Tag(name = "Reviews and Testimonials", description = "Verified buyer reviews for products and tourism experiences")
public class ReviewController {

    private final ReviewService reviewService;
    private final UserRepository userRepository;

    private User getActorUser(UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Submit a verified review after delivered order or completed booking")
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @Valid @RequestBody CreateReviewRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User reviewer = getActorUser(principal);
        ReviewResponse response = reviewService.createReview(request, reviewer);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping("/public/target")
    @Operation(summary = "Get reviews and average rating for a product or experience")
    public ResponseEntity<ApiResponse<ReviewSummaryResponse>> getTargetReviews(
            @RequestParam ReviewTargetType targetType,
            @RequestParam UUID targetId
    ) {
        ReviewSummaryResponse summary = reviewService.getTargetReviews(targetType, targetId);
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/public/testimonials")
    @Operation(summary = "Get recent public testimonials for homepage")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getTestimonials() {
        List<ReviewResponse> list = reviewService.getRecentPublicTestimonials();
        return ResponseEntity.ok(ApiResponse.ok(list));
    }
}
