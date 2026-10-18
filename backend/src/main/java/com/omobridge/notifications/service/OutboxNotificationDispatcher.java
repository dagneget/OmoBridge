package com.omobridge.notifications.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.omobridge.common.outbox.OutboxEvent;
import com.omobridge.common.outbox.OutboxEventRepository;
import com.omobridge.notifications.domain.NotificationChannel;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxNotificationDispatcher {

    private final OutboxEventRepository outboxEventRepository;
    private final NotificationService notificationService;

    @Transactional
    public int dispatchPendingOutboxEvents(int batchSize) {
        Instant now = Instant.now();
        List<OutboxEvent> events = outboxEventRepository.findPendingEvents(now, PageRequest.of(0, batchSize));
        int processedCount = 0;

        for (OutboxEvent event : events) {
            try {
                processSingleEvent(event);
                event.setProcessedAt(Instant.now());
                event.setLastError(null);
                processedCount++;
            } catch (Exception e) {
                log.error("Failed to process outbox event {} of type {}: {}",
                        event.getId(), event.getEventType(), e.getMessage(), e);
                event.setAttempts(event.getAttempts() + 1);
                event.setLastError(e.getMessage());
                event.setAvailableAt(Instant.now().plus(Duration.ofMinutes(Math.min(30, 2L * event.getAttempts()))));
            }
            outboxEventRepository.save(event);
        }

        return processedCount;
    }

    private void processSingleEvent(OutboxEvent event) {
        JsonNode payload = event.getPayload();
        String eventType = event.getEventType();

        if (payload == null || !payload.has("phone")) {
            log.debug("Outbox event {} has no recipient phone; skipping notification dispatch", event.getId());
            return;
        }

        String phone = payload.get("phone").asText();
        String language = payload.has("language") ? payload.get("language").asText() : "en";

        Map<String, String> variables = new HashMap<>();
        payload.fields().forEachRemaining(entry -> {
            if (!entry.getValue().isNull()) {
                variables.put(entry.getKey(), entry.getValue().asText());
            }
        });

        notificationService.queueNotification(
                null,
                phone,
                NotificationChannel.SMS,
                eventType,
                language,
                variables,
                event.getAggregateType(),
                event.getAggregateId()
        );
    }
}
