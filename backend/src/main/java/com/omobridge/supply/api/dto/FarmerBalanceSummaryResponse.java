package com.omobridge.supply.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record FarmerBalanceSummaryResponse(
        UUID farmerId,
        String farmerName,
        String farmerCode,
        BigDecimal totalDeliveredValue,
        BigDecimal totalSettled,
        BigDecimal totalPendingPayout,
        int openPayablesCount
) {}
