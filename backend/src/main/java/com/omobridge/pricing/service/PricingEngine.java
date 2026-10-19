package com.omobridge.pricing.service;

import com.omobridge.common.util.MoneyUtil;
import com.omobridge.pricing.api.dto.PriceBreakdownLine;
import com.omobridge.pricing.api.dto.PriceBreakdownResponse;
import com.omobridge.pricing.domain.PriceRule;
import com.omobridge.pricing.domain.PriceRuleRepository;
import com.omobridge.pricing.domain.PriceRuleType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PricingEngine {

    private final PriceRuleRepository priceRuleRepository;

    @Transactional(readOnly = true)
    public PriceBreakdownResponse calculatePricing(
            BigDecimal baseAmount,
            UUID enterpriseId,
            String appliesTo,
            Instant evaluationTime
    ) {
        BigDecimal sanitizedBase = MoneyUtil.roundMoney(baseAmount);
        Instant now = evaluationTime != null ? evaluationTime : Instant.now();

        List<PriceRule> activeRules = priceRuleRepository.findActiveRules(enterpriseId, appliesTo, now);
        List<PriceBreakdownLine> breakdown = new ArrayList<>();
        BigDecimal runningTotal = sanitizedBase;

        for (PriceRule rule : activeRules) {
            BigDecimal lineAmount;
            if (rule.getRuleType() == PriceRuleType.PERCENTAGE) {
                lineAmount = sanitizedBase.multiply(rule.getValue())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            } else {
                lineAmount = MoneyUtil.roundMoney(rule.getValue());
            }

            breakdown.add(new PriceBreakdownLine(
                    rule.getCode(),
                    rule.getLabel(),
                    rule.getRuleType(),
                    rule.getValue(),
                    lineAmount
            ));

            runningTotal = runningTotal.add(lineAmount);
        }

        return new PriceBreakdownResponse(
                sanitizedBase,
                breakdown,
                runningTotal,
                "ETB"
        );
    }
}
