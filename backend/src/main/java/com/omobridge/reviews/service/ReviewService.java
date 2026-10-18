package com.omobridge.reviews.service;

import com.omobridge.bookings.domain.Booking;
import com.omobridge.bookings.domain.BookingRepository;
import com.omobridge.bookings.domain.BookingStatus;
import com.omobridge.bookings.domain.BookingItemType;
import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ConflictException;
import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.identity.domain.User;
import com.omobridge.orders.domain.Order;
import com.omobridge.orders.domain.OrderRepository;
import com.omobridge.orders.domain.OrderStatus;
import com.omobridge.reviews.api.dto.CreateReviewRequest;
import com.omobridge.reviews.api.dto.ReviewResponse;
import com.omobridge.reviews.api.dto.ReviewSummaryResponse;
import com.omobridge.reviews.domain.Review;
import com.omobridge.reviews.domain.ReviewRepository;
import com.omobridge.reviews.domain.ReviewTargetType;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final BookingRepository bookingRepository;
    private final AuditService auditService;

    @Transactional
    public ReviewResponse createReview(CreateReviewRequest request, User reviewer) {
        if ((request.orderId() == null) == (request.bookingId() == null)) {
            throw new BusinessRuleException("Review requires exactly one delivered order or completed booking");
        }

        Order verifiedOrder = null;
        if (request.orderId() != null) {
            verifiedOrder = orderRepository.findById(request.orderId())
                    .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + request.orderId()));
            if (!verifiedOrder.getBuyer().getId().equals(reviewer.getId())) {
                throw new ForbiddenException("Cannot review an order placed by another user");
            }
            if (verifiedOrder.getStatus() != OrderStatus.DELIVERED) {
                throw new BusinessRuleException("Cannot review product before order is DELIVERED. Current status: " + verifiedOrder.getStatus());
            }
        }

        Booking verifiedBooking = null;
        if (request.bookingId() != null) {
            verifiedBooking = bookingRepository.findById(request.bookingId())
                    .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + request.bookingId()));
            if (!verifiedBooking.getBuyer().getId().equals(reviewer.getId())) {
                throw new ForbiddenException("Cannot review a booking placed by another user");
            }
            if (verifiedBooking.getStatus() != BookingStatus.COMPLETED) {
                throw new BusinessRuleException("Cannot review experience before booking is completed. Current status: " + verifiedBooking.getStatus());
            }
        }

        boolean matches = false;
        if (verifiedOrder != null) {
            matches = switch (request.targetType()) {
                case PRODUCT -> verifiedOrder.getItems().stream()
                        .anyMatch(item -> item.getProduct().getId().equals(request.targetId()));
                case ENTERPRISE -> verifiedOrder.getEnterprise().getId().equals(request.targetId());
                default -> false;
            };
        } else if (verifiedBooking != null) {
            matches = switch (request.targetType()) {
                case EXPERIENCE -> (verifiedBooking.getSession() != null
                        && verifiedBooking.getSession().getTourPackage().getId().equals(request.targetId()))
                        || verifiedBooking.getItems().stream().anyMatch(item ->
                                item.getItemType() == BookingItemType.PACKAGE
                                        && item.getItemId().equals(request.targetId()));
                case GUIDE -> (verifiedBooking.getAssignedGuide() != null
                        && verifiedBooking.getAssignedGuide().getId().equals(request.targetId()))
                        || verifiedBooking.getItems().stream().anyMatch(item ->
                                item.getItemType() == BookingItemType.GUIDE
                                        && item.getItemId().equals(request.targetId()));
                case ENTERPRISE -> verifiedBooking.getEnterprise().getId().equals(request.targetId());
                default -> false;
            };
        }
        if (!matches) {
            throw new BusinessRuleException("Review target is not part of the verified order or booking");
        }

        if (reviewRepository.existsByReviewerUserIdAndTargetTypeAndTargetId(reviewer.getId(), request.targetType(), request.targetId())) {
            throw new ConflictException("Review already submitted by this user for the specified item");
        }

        Review review = new Review();
        review.setReviewerUser(reviewer);
        review.setTargetType(request.targetType());
        review.setTargetId(request.targetId());
        review.setOrder(verifiedOrder);
        review.setBooking(verifiedBooking);
        review.setRating(request.rating());
        review.setComment(request.comment());
        review.setPublic(true);

        Review saved = reviewRepository.save(review);
        auditService.record("REVIEW_CREATED", "REVIEW", saved.getId(),
                "Review rating=" + saved.getRating() + " target=" + saved.getTargetType() + " " + saved.getTargetId());

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public ReviewSummaryResponse getTargetReviews(ReviewTargetType targetType, UUID targetId) {
        List<Review> reviews = reviewRepository.findByTargetTypeAndTargetIdAndIsPublicTrueOrderByCreatedAtDesc(targetType, targetId);
        Double avg = reviewRepository.getAverageRatingForTarget(targetType, targetId);
        double averageRating = (avg != null) ? Math.round(avg * 10.0) / 10.0 : 0.0;
        long count = reviewRepository.countByTargetTypeAndTargetIdAndIsPublicTrue(targetType, targetId);

        List<ReviewResponse> responseList = reviews.stream()
                .map(this::mapToResponse)
                .toList();

        return new ReviewSummaryResponse(targetType, targetId, averageRating, count, responseList);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getRecentPublicTestimonials() {
        return reviewRepository.findByIsPublicTrueOrderByCreatedAtDesc().stream()
                .limit(20)
                .map(this::mapToResponse)
                .toList();
    }

    private ReviewResponse mapToResponse(Review r) {
        return new ReviewResponse(
                r.getId(),
                r.getReviewerUser().getId(),
                r.getReviewerUser().getFullName(),
                r.getTargetType(),
                r.getTargetId(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt()
        );
    }
}
