package com.omobridge.traceability.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductionOutputResponse(
        UUID id,
        UUID productTypeId,
        String productTypeName,
        BigDecimal quantity,
        String unit,
        String grade,
        UUID resultingLotId
) {}
