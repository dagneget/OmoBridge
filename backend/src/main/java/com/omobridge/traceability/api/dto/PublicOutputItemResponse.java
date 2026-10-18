package com.omobridge.traceability.api.dto;

import java.math.BigDecimal;

public record PublicOutputItemResponse(
        String productName,
        BigDecimal quantity,
        String unit,
        String grade
) {}
