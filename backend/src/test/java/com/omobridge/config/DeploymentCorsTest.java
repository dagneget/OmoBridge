package com.omobridge.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.common.security.JwtAuthenticationFilter;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.cors.DefaultCorsProcessor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class DeploymentCorsTest {
    private final SecurityConfig security = new SecurityConfig(
            mock(JwtAuthenticationFilter.class), new ObjectMapper());

    @Test
    void shouldAllowPaymentPreflightWhenOriginIsConfigured() throws Exception {
        var response = preflight("https://shop.example.com");
        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(response.getHeader("Access-Control-Allow-Origin")).isEqualTo("https://shop.example.com");
        assertThat(response.getHeader("Access-Control-Allow-Headers"))
                .containsIgnoringCase("x-idempotency-key");
    }

    @Test
    void shouldAllowPublicProductPreflightWithCacheControl() throws Exception {
        var request = new MockHttpServletRequest("OPTIONS", "/api/v1/public/products/123");
        request.addHeader("Origin", "https://shop.example.com");
        request.addHeader("Access-Control-Request-Method", "GET");
        request.addHeader("Access-Control-Request-Headers", "cache-control");
        var response = new MockHttpServletResponse();
        var source = security.corsConfigurationSource(List.of("https://shop.example.com"));
        new DefaultCorsProcessor().processRequest(source.getCorsConfiguration(request), request, response);
        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(response.getHeader("Access-Control-Allow-Origin")).isEqualTo("https://shop.example.com");
        assertThat(response.getHeader("Access-Control-Allow-Headers")).containsIgnoringCase("cache-control");
    }

    @Test
    void shouldRejectPreflightWhenOriginIsNotConfigured() throws Exception {
        var response = preflight("https://untrusted.example.com");
        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getHeader("Access-Control-Allow-Origin")).isNull();
    }

    @Test
    void shouldRejectWildcardWhenCredentialsAreEnabled() {
        assertThatThrownBy(() -> security.corsConfigurationSource(List.of("*")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private MockHttpServletResponse preflight(String origin) throws Exception {
        var request = new MockHttpServletRequest("OPTIONS", "/api/v1/payments");
        request.addHeader("Origin", origin);
        request.addHeader("Access-Control-Request-Method", "POST");
        request.addHeader("Access-Control-Request-Headers", "authorization,content-type,x-idempotency-key");
        var response = new MockHttpServletResponse();
        var source = security.corsConfigurationSource(List.of("https://shop.example.com"));
        new DefaultCorsProcessor().processRequest(source.getCorsConfiguration(request), request, response);
        return response;
    }
}
