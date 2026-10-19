package com.omobridge.reviews.service;

import com.omobridge.bookings.domain.Booking;
import com.omobridge.bookings.domain.BookingItem;
import com.omobridge.bookings.domain.BookingItemType;
import com.omobridge.bookings.domain.BookingRepository;
import com.omobridge.bookings.domain.BookingStatus;
import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ConflictException;
import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.identity.domain.User;
import com.omobridge.orders.domain.OrderRepository;
import com.omobridge.reviews.api.dto.CreateReviewRequest;
import com.omobridge.reviews.domain.Review;
import com.omobridge.reviews.domain.ReviewRepository;
import com.omobridge.reviews.domain.ReviewTargetType;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewEligibilityTest {
    @Mock ReviewRepository reviews;
    @Mock OrderRepository orders;
    @Mock BookingRepository bookings;
    @Mock AuditService audit;
    @InjectMocks ReviewService service;
    private User buyer;
    private Booking booking;
    private UUID target;

    @BeforeEach
    void setup() {
        buyer = new User();
        buyer.setId(UUID.randomUUID());
        buyer.setFullName("Buyer");
        booking = new Booking();
        booking.setId(UUID.randomUUID());
        booking.setBuyer(buyer);
        booking.setStatus(BookingStatus.COMPLETED);
        target = UUID.randomUUID();
        var item = new BookingItem();
        item.setItemType(BookingItemType.PACKAGE);
        item.setItemId(target);
        booking.addItem(item);
        when(bookings.findById(booking.getId())).thenReturn(Optional.of(booking));
    }

    private CreateReviewRequest request(UUID targetId) {
        return new CreateReviewRequest(ReviewTargetType.EXPERIENCE, targetId,
                null, booking.getId(), 5, "Wonderful visit");
    }

    @Test
    void shouldAcceptPurchasedExperienceWhenBookingCompleted() {
        when(reviews.save(any(Review.class))).thenAnswer(invocation -> {
            Review review = invocation.getArgument(0);
            review.setId(UUID.randomUUID());
            return review;
        });
        var response = service.createReview(request(target), buyer);
        assertThat(response.targetId()).isEqualTo(target);
        assertThat(response.rating()).isEqualTo(5);
        verify(reviews).save(any(Review.class));
    }

    @ParameterizedTest
    @EnumSource(value = BookingStatus.class, names = "COMPLETED", mode = EnumSource.Mode.EXCLUDE)
    void shouldRejectEarlyReviewWhenBookingNotCompleted(BookingStatus status) {
        booking.setStatus(status);
        assertThatThrownBy(() -> service.createReview(request(target), buyer))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("before booking is completed");
        verify(reviews, never()).save(any());
    }

    @Test
    void shouldRejectUnrelatedExperienceWhenBookingCompleted() {
        assertThatThrownBy(() -> service.createReview(request(UUID.randomUUID()), buyer))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("not part of");
        verify(reviews, never()).save(any());
    }

    @Test
    void shouldRejectDuplicateWhenItemAlreadyReviewed() {
        when(reviews.existsByReviewerUserIdAndTargetTypeAndTargetId(
                buyer.getId(), ReviewTargetType.EXPERIENCE, target)).thenReturn(true);
        assertThatThrownBy(() -> service.createReview(request(target), buyer))
                .isInstanceOf(ConflictException.class).hasMessageContaining("already submitted");
        verify(reviews, never()).save(any());
    }

    @Test
    void shouldRejectForeignBookingWhenReviewerDiffers() {
        var stranger = new User();
        stranger.setId(UUID.randomUUID());
        assertThatThrownBy(() -> service.createReview(request(target), stranger))
                .isInstanceOf(ForbiddenException.class);
        verify(reviews, never()).save(any());
    }
}
