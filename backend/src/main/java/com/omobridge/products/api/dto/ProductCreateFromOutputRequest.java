package com.omobridge.products.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductCreateFromOutputRequest(
        @NotNull UUID productionOutputId,
        @NotBlank String sku,
        @NotBlank String name,
        String description,
        String story,
        @NotBlank String category,
        @NotNull @DecimalMin("0.01") BigDecimal packSize,
        @NotNull @DecimalMin("0.01") BigDecimal initialStock,
        BigDecimal transportCost,
        BigDecimal marginRate,
        boolean publishImmediately
) {}
