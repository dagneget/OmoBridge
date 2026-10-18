package com.omobridge.pricing.api.dto;

import com.omobridge.pricing.domain.PriceRuleType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

public record PriceRuleRequest(
    @NotBlank(message = "Rule code is required")
    String code,

    @NotBlank(message = "Rule label is required")
    String label,

    @NotNull(message = "Rule type is required")
    PriceRuleType ruleType,

    @NotNull(message = "Value is required")
    @DecimalMin(value = "0.00", message = "Value cannot be negative")
    BigDecimal value,

    @NotBlank(message = "appliesTo is required")
    String appliesTo,

    @NotBlank(message = "chargedTo is required")
    String chargedTo,

    Instant effectiveFrom,

    Instant effectiveTo,

    Boolean isActive
) {}
