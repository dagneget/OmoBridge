package com.omobridge.ai.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record FarmerBalanceSummaryResponse(
        UUID enterpriseId,
        long totalRegisteredFarmers,
        long farmersWithPendingBalance,
        BigDecimal totalPendingPayablesEtb,
        BigDecimal totalDisbursedPayablesEtb
) {}
