package com.omobridge.traceability.api.dto;

import java.time.Instant;
import java.util.List;

public record PublicTraceResponse(
        String publicToken,
        String batchCode,
        String enterpriseName,
        String originVillage,
        String originLabel,
        Instant processingDate,
        String publicStory,
        List<PublicFarmerOriginResponse> farmerOrigins,
        List<PublicOutputItemResponse> outputs,
        long scanCount
) {}
