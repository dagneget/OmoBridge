package com.omobridge.traceability.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductionLossResponse(
        UUID id,
        BigDecimal quantity,
        String unit,
        String reason
) {}
