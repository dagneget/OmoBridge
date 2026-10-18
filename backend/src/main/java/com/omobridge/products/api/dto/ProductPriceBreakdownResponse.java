package com.omobridge.products.api.dto;

import java.math.BigDecimal;

public record ProductPriceBreakdownResponse(
        BigDecimal purchaseCost,
        BigDecimal processingCost,
        BigDecimal packagingCost,
        BigDecimal laborCost,
        BigDecimal transportCost,
        BigDecimal enterpriseMargin,
        BigDecimal communityFund,
        BigDecimal taxAmount,
        BigDecimal platformFee,
        BigDecimal totalPrice
) {}
