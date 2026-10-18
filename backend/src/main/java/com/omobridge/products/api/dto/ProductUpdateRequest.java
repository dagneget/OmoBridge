package com.omobridge.products.api.dto;

import java.math.BigDecimal;

public record ProductUpdateRequest(
        String name,
        String description,
        String story,
        BigDecimal unitPrice,
        Boolean published
) {}
