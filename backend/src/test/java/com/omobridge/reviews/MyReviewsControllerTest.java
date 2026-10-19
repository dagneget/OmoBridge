package com.omobridge.reviews;

import com.omobridge.common.security.JwtAuthenticationFilter;
import com.omobridge.common.security.JwtService;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.config.SecurityConfig;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.reviews.api.ReviewController;
import com.omobridge.reviews.service.ReviewService;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReviewController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class MyReviewsControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean ReviewService service;
    @MockitoBean UserRepository users;
    @MockitoBean JwtService jwt;

    @Test
    void shouldUsePrincipalWhenCallerSuppliesAnotherReviewer() throws Exception {
        var id = UUID.randomUUID();
        var principal = UserPrincipal.create(id, "+251911000000", Set.of("BUYER_VISITOR"));
        var auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        when(service.getMyReviews(eq(id), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        mvc.perform(get("/api/v1/reviews/my").param("reviewerId", UUID.randomUUID().toString())
                        .with(authentication(auth)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(0));
        verify(service).getMyReviews(eq(id), any(Pageable.class));
    }

    @Test
    void shouldRequireAuthenticationWhenListingReviews() throws Exception {
        mvc.perform(get("/api/v1/reviews/my")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }
}
