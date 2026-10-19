package com.omobridge.inventory.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ReconciliationReportResponse(
        UUID lotId,
        String lotCode,
        BigDecimal storedBalance,
        BigDecimal movementSum,
        boolean reconciled,
        String note
) {}
