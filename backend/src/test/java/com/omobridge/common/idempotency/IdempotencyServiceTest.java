package com.omobridge.common.idempotency;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.omobridge.common.exception.ConflictException;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class IdempotencyServiceTest {

    @Mock
    private IdempotencyRecordRepository repository;

    @InjectMocks
    private IdempotencyService idempotencyService;

    @Test
    @DisplayName("First execution reserves key and returns empty")
    void firstExecution_reservesKey() {
        String key = "test-key-123";
        String payload = "{\"orderId\":\"12345\"}";

        when(repository.findByIdempotencyKey(key)).thenReturn(Optional.empty());

        Optional<IdempotencyRecord> result = idempotencyService.checkOrReserve(key, "ORDERS", payload);

        assertThat(result).isEmpty();
        verify(repository).save(any(IdempotencyRecord.class));
    }

    @Test
    @DisplayName("Repeated call with exact same payload returns existing record")
    void repeatedCall_samePayload_returnsRecord() {
        String key = "test-key-123";
        String payload = "{\"orderId\":\"12345\"}";
        String hash = IdempotencyService.computeHash(payload);

        IdempotencyRecord existing = new IdempotencyRecord();
        existing.setIdempotencyKey(key);
        existing.setRequestHash(hash);
        existing.setResponseStatus(200);
        existing.setResponseBody("{\"success\":true}");

        when(repository.findByIdempotencyKey(key)).thenReturn(Optional.of(existing));

        Optional<IdempotencyRecord> result = idempotencyService.checkOrReserve(key, "ORDERS", payload);

        assertThat(result).isPresent();
        assertThat(result.get().getResponseStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("Repeated call with different payload throws ConflictException")
    void repeatedCall_differentPayload_throwsConflict() {
        String key = "test-key-123";
        String originalPayload = "{\"orderId\":\"12345\"}";
        String differentPayload = "{\"orderId\":\"99999\"}";

        IdempotencyRecord existing = new IdempotencyRecord();
        existing.setIdempotencyKey(key);
        existing.setRequestHash(IdempotencyService.computeHash(originalPayload));

        when(repository.findByIdempotencyKey(key)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> idempotencyService.checkOrReserve(key, "ORDERS", differentPayload))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("previously used with a different request payload");
    }
}
