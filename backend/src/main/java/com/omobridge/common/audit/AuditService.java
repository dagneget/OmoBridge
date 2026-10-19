package com.omobridge.common.audit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.omobridge.common.security.SecurityUtils;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private static final Set<String> SENSITIVE_KEYS = Set.of(
            "password", "secret", "token", "authorization", "pin", "credential", "creditcard", "cvv", "key"
    );

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.MANDATORY)
    public AuditLog recordInCurrentTransaction(String action, String entityType, UUID entityId, Object details) {
        return doRecord(action, entityType, entityId, details);
    }

    @Transactional
    public AuditLog record(String action, String entityType, UUID entityId, Object details) {
        return doRecord(action, entityType, entityId, details);
    }

    private AuditLog doRecord(String action, String entityType, UUID entityId, Object details) {
        AuditLog logEntry = new AuditLog();
        logEntry.setAction(action);
        logEntry.setEntityType(entityType);
        logEntry.setEntityId(entityId);

        SecurityUtils.getCurrentUser().ifPresent(principal -> {
            User actor = userRepository.findById(principal.getId()).orElse(null);
            logEntry.setActor(actor);
            if (!principal.getAuthorities().isEmpty()) {
                logEntry.setActorRole(principal.getAuthorities().iterator().next().getAuthority());
            }
        });

        if (details != null) {
            JsonNode tree = objectMapper.valueToTree(details);
            sanitizeSensitiveData(tree);
            logEntry.setDetails(tree);
        }

        return auditLogRepository.save(logEntry);
    }

    private void sanitizeSensitiveData(JsonNode node) {
        if (node.isObject()) {
            ObjectNode objectNode = (ObjectNode) node;
            Iterator<Map.Entry<String, JsonNode>> fields = objectNode.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                String key = field.getKey().toLowerCase();
                if (SENSITIVE_KEYS.stream().anyMatch(key::contains)) {
                    objectNode.put(field.getKey(), "***REDACTED***");
                } else if (field.getValue().isContainerNode()) {
                    sanitizeSensitiveData(field.getValue());
                }
            }
        } else if (node.isArray()) {
            for (JsonNode element : node) {
                if (element.isContainerNode()) {
                    sanitizeSensitiveData(element);
                }
            }
        }
    }
}
