package com.omobridge.common.idempotency;

import com.omobridge.common.exception.ConflictException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final IdempotencyRecordRepository repository;

    @Transactional
    public Optional<IdempotencyRecord> checkOrReserve(String key, String scope, String payload) {
        if (key == null || key.isBlank()) {
            return Optional.empty();
        }

        String requestHash = computeHash(payload);
        Optional<IdempotencyRecord> existing = repository.findByIdempotencyKey(key);

        if (existing.isPresent()) {
            IdempotencyRecord record = existing.get();
            if (!record.getRequestHash().equals(requestHash)) {
                throw new ConflictException("Idempotency key '" + key + "' was previously used with a different request payload");
            }
            return Optional.of(record);
        }

        IdempotencyRecord record = new IdempotencyRecord();
        record.setIdempotencyKey(key);
        record.setScope(scope != null ? scope : "GLOBAL");
        record.setRequestHash(requestHash);
        repository.save(record);

        return Optional.empty(); // Not previously executed
    }

    @Transactional
    public void recordResponse(String key, int status, String responseBody) {
        if (key == null || key.isBlank()) {
            return;
        }

        repository.findByIdempotencyKey(key).ifPresent(record -> {
            record.setResponseStatus(status);
            record.setResponseBody(responseBody);
            repository.save(record);
        });
    }

    public static String computeHash(String input) {
        if (input == null) {
            return "";
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }
}
