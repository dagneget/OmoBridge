package com.omobridge.traceability.api.dto;

import java.util.List;

public record TraceValidationResponse(
        boolean valid,
        String note,
        List<String> issues,
        int inputLotCount,
        int farmerCount
) {}
