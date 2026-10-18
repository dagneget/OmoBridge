package com.omobridge.common.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionalOutboxService {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.MANDATORY)
    public OutboxEvent publishInTransaction(String eventType, String aggregateType, UUID aggregateId, Object payload) {
        return doPublish(eventType, aggregateType, aggregateId, payload);
    }

    @Transactional
    public OutboxEvent publish(String eventType, String aggregateType, UUID aggregateId, Object payload) {
        return doPublish(eventType, aggregateType, aggregateId, payload);
    }

    private OutboxEvent doPublish(String eventType, String aggregateType, UUID aggregateId, Object payload) {
        OutboxEvent event = new OutboxEvent();
        event.setEventType(eventType);
        event.setAggregateType(aggregateType);
        event.setAggregateId(aggregateId);
        event.setPayload(objectMapper.valueToTree(payload));
        event.setAvailableAt(Instant.now());

        OutboxEvent saved = outboxEventRepository.save(event);
        log.debug("Outbox event published: {} for aggregate {} [{}]", eventType, aggregateType, aggregateId);
        return saved;
    }
}
