package com.omobridge.ai.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record EnterpriseImpactMetricsResponse(
        UUID enterpriseId,
        long activeFarmersCount,
        BigDecimal totalFarmerDisbursedEtb,
        BigDecimal totalSupplyQuantity,
        BigDecimal averageProducerPriceSharePercent,
        BigDecimal averageHouseholdIncomeIncrementEtb,
        long totalOrdersCount,
        double repeatBuyerRetentionRate
) {}
