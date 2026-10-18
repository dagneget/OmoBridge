package com.omobridge.traceability.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ProductionLossRequest(
        @NotNull @DecimalMin("0.00") BigDecimal quantity,
        @NotBlank String unit,
        @NotBlank String reason
) {}
