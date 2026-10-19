package com.omobridge.pricing.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record PriceBreakdownResponse(
    BigDecimal subtotal,
    List<PriceBreakdownLine> breakdown,
    BigDecimal total,
    String currency
) {}
