package com.omobridge.common.security;

import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Test
    @DisplayName("Should return 401 when calling protected endpoint without token")
    void shouldReturn401WithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/test/protected")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Should return 200 when calling protected endpoint with valid JWT token")
    void shouldReturn200WithValidToken() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId, "+251911223344", Set.of("BUYER_VISITOR"));

        mockMvc.perform(get("/api/v1/test/protected")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Access granted"))
                .andExpect(jsonPath("$.userId").value(userId.toString()))
                .andExpect(jsonPath("$.username").value("+251911223344"));
    }

    @Test
    @DisplayName("Should return 401 when calling protected endpoint with invalid JWT token")
    void shouldReturn401WithInvalidToken() throws Exception {
        mockMvc.perform(get("/api/v1/test/protected")
                        .header("Authorization", "Bearer invalid-tampered-token")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Should return 403 when accessing role-restricted endpoint with insufficient role")
    void shouldReturn403WhenInsufficientRole() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId, "+251911223344", Set.of("BUYER_VISITOR"));

        mockMvc.perform(get("/api/v1/test/admin-only")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    @DisplayName("Should return 200 when accessing role-restricted endpoint with authorized role")
    void shouldReturn200WhenAuthorizedRole() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId, "+251900000001", Set.of("SYSTEM_ADMIN"));

        mockMvc.perform(get("/api/v1/test/admin-only")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Admin access granted"));
    }

    @Test
    @DisplayName("Should permit unauthenticated access to actuator health")
    void shouldPermitActuatorHealthWithoutToken() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
