package com.omobridge.common.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.identity.domain.UserRepository;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private UserRepository userRepository;

    private ObjectMapper objectMapper;
    private AuditService auditService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        auditService = new AuditService(auditLogRepository, userRepository, objectMapper);
    }

    @Test
    @DisplayName("Should redact sensitive keys in audit log details")
    void shouldRedactSensitiveKeys() {
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> details = Map.of(
                "action", "USER_LOGIN",
                "password", "secretPassword123!",
                "apiKey", "mySecretToken",
                "normalField", "regularValue"
        );

        UUID entityId = UUID.randomUUID();
        AuditLog saved = auditService.record("LOGIN_ATTEMPT", "USER", entityId, details);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog captured = captor.getValue();
        assertThat(captured.getDetails().get("password").asText()).isEqualTo("***REDACTED***");
        assertThat(captured.getDetails().get("apiKey").asText()).isEqualTo("***REDACTED***");
        assertThat(captured.getDetails().get("normalField").asText()).isEqualTo("regularValue");
    }
}
