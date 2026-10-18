package com.omobridge.identity.service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long BLOCK_DURATION_SECONDS = 900; // 15 minutes

    private final Map<String, AttemptInfo> attemptsCache = new ConcurrentHashMap<>();

    public void loginSucceeded(String key) {
        attemptsCache.remove(key.toLowerCase());
    }

    public void loginFailed(String key) {
        String normalizedKey = key.toLowerCase();
        attemptsCache.compute(normalizedKey, (k, current) -> {
            Instant now = Instant.now();
            if (current == null || current.isExpired(now)) {
                return new AttemptInfo(1, now);
            }
            return new AttemptInfo(current.attempts() + 1, current.firstAttemptTime());
        });
    }

    public boolean isBlocked(String key) {
        AttemptInfo info = attemptsCache.get(key.toLowerCase());
        if (info == null) {
            return false;
        }
        Instant now = Instant.now();
        if (info.isExpired(now)) {
            attemptsCache.remove(key.toLowerCase());
            return false;
        }
        return info.attempts() >= MAX_ATTEMPTS;
    }

    public void reset(String key) {
        attemptsCache.remove(key.toLowerCase());
    }

    private record AttemptInfo(int attempts, Instant firstAttemptTime) {
        boolean isExpired(Instant now) {
            return now.isAfter(firstAttemptTime.plusSeconds(BLOCK_DURATION_SECONDS));
        }
    }
}
