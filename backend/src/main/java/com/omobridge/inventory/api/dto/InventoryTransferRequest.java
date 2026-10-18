package com.omobridge.inventory.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record InventoryTransferRequest(
        @NotNull UUID targetLocationId,
        @NotNull @DecimalMin("0.01") BigDecimal quantity,
        String reason
) {}
