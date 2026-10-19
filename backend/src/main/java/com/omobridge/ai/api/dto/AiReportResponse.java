package com.omobridge.ai.api.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.omobridge.ai.domain.AiReportStatus;
import java.time.Instant;
import java.util.UUID;

public record AiReportResponse(
        UUID id,
        UUID enterpriseId,
        String reportType,
        String period,
        String language,
        String content,
        AiReportStatus status,
        JsonNode dataSnapshot,
        Instant createdAt
) {}
