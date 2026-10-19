package com.omobridge.inventory.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record InventoryDisposalRequest(
        @NotNull @DecimalMin("0.01") BigDecimal quantity,
        @NotBlank String reason
) {}
