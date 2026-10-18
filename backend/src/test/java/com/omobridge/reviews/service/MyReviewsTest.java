package com.omobridge.reviews.service;

import com.omobridge.reviews.domain.ReviewRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class MyReviewsTest {
    @Mock ReviewRepository repository;
    @InjectMocks ReviewService service;

    @Test
    void shouldBoundAndStabilizePageWhenListingOwnReviews() {
        var reviewer = UUID.randomUUID();
        var page = ArgumentCaptor.forClass(Pageable.class);
        when(repository.findByReviewerUserId(eq(reviewer), page.capture()))
                .thenReturn(new PageImpl<>(List.of()));
        assertThat(service.getMyReviews(reviewer, PageRequest.of(2, 500, Sort.by("createdAt"))))
                .isEmpty();
        assertThat(page.getValue().getPageSize()).isEqualTo(100);
        assertThat(page.getValue().getPageNumber()).isEqualTo(2);
        assertThat(page.getValue().getSort().getOrderFor("id")).isNotNull();
    }

    @Test
    void shouldRejectSensitiveSortWhenListingOwnReviews() {
        assertThatThrownBy(() -> service.getMyReviews(UUID.randomUUID(),
                PageRequest.of(0, 20, Sort.by("reviewerUser.passwordHash"))))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(repository);
    }

    @Test
    void shouldRejectUnboundedHistoryWhenPaginationMissing() {
        assertThatThrownBy(() -> service.getMyReviews(UUID.randomUUID(), Pageable.unpaged()))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(repository);
    }
}
