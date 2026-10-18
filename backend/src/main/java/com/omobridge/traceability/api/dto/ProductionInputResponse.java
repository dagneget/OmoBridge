package com.omobridge.traceability.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductionInputResponse(
        UUID id,
        UUID lotId,
        String lotCode,
        BigDecimal quantity,
        String unit
) {}
