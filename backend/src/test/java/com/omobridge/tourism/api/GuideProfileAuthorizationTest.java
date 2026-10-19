package com.omobridge.tourism.api;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.omobridge.common.security.JwtAuthenticationFilter;
import com.omobridge.common.security.JwtService;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.config.SecurityConfig;
import com.omobridge.tourism.api.dto.GuideResponse;
import com.omobridge.tourism.service.GuideService;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(GuideController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class GuideProfileAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GuideService guideService;

    @MockitoBean
    private JwtService jwtService;

    @Test
    void shouldReturnOwnProfileWhenTourGuide() throws Exception {
        var userId = UUID.randomUUID();
        var guideId = UUID.randomUUID();
        var principal = UserPrincipal.create(userId, "+251911000000", Set.of("TOUR_GUIDE"));
        var auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        var profile = new GuideResponse(guideId, userId, "Test Guide", null, null, null,
                java.util.List.of("en"), null, null, "ETB", null, true);
        when(guideService.getGuideByUserId(userId)).thenReturn(profile);

        mockMvc.perform(get("/api/v1/tourism/guides/me").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(guideId.toString()))
                .andExpect(jsonPath("$.data.userId").value(userId.toString()));

        verify(guideService).getGuideByUserId(userId);
    }

    @Test
    void shouldReturnUnauthorizedWhenAnonymous() throws Exception {
        mockMvc.perform(get("/api/v1/tourism/guides/me"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(guideService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"BUYER_VISITOR", "PRODUCER_FARMER", "MICRO_ENTERPRISE",
            "DELIVERY_PROVIDER", "TOURISM_AUTHORITY", "SYSTEM_ADMIN", "TOURISM_GUIDE"})
    void shouldReturnForbiddenWhenNotTourGuide(String role) throws Exception {
        var principal = UserPrincipal.create(UUID.randomUUID(), "+251911000000", Set.of(role));
        var auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        mockMvc.perform(get("/api/v1/tourism/guides/me").with(authentication(auth)))
                .andExpect(status().isForbidden());

        verifyNoInteractions(guideService);
    }
}
