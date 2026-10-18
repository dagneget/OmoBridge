package com.omobridge.pricing.api.dto;

import com.omobridge.pricing.domain.PriceRuleType;
import java.math.BigDecimal;

public record PriceBreakdownLine(
    String code,
    String label,
    PriceRuleType ruleType,
    BigDecimal rateOrValue,
    BigDecimal amount
) {}
