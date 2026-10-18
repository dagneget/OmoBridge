package com.omobridge.traceability.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductionInputRequest(
        @NotNull UUID lotId,
        @NotNull @DecimalMin("0.01") BigDecimal quantity,
        @NotBlank String unit
) {}
