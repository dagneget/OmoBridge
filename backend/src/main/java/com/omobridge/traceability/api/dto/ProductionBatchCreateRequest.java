package com.omobridge.traceability.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ProductionBatchCreateRequest(
        @NotNull UUID enterpriseId,
        BigDecimal laborCost,
        BigDecimal processingCost,
        BigDecimal packagingCost,
        String notes,
        @NotEmpty @Valid List<ProductionInputRequest> inputs,
        @NotEmpty @Valid List<ProductionOutputRequest> outputs,
        @Valid List<ProductionLossRequest> losses,
        boolean completeImmediately,
        String originVillage,
        String originLabel,
        String publicStory,
        boolean showFarmerNames
) {}
