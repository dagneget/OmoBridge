package com.omobridge.pricing.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.omobridge.pricing.api.dto.PriceBreakdownResponse;
import com.omobridge.pricing.domain.PriceRule;
import com.omobridge.pricing.domain.PriceRuleRepository;
import com.omobridge.pricing.domain.PriceRuleType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PricingEngineTest {

    @Mock
    private PriceRuleRepository priceRuleRepository;

    @InjectMocks
    private PricingEngine pricingEngine;

    @Test
    @DisplayName("Should correctly calculate percentage and fixed rules line-by-line")
    void shouldCalculatePricingBreakdown() {
        UUID enterpriseId = UUID.randomUUID();
        BigDecimal base = new BigDecimal("1000.00");

        PriceRule vatRule = new PriceRule();
        vatRule.setCode("VAT_15");
        vatRule.setLabel("Value Added Tax");
        vatRule.setRuleType(PriceRuleType.PERCENTAGE);
        vatRule.setValue(new BigDecimal("15.00")); // 15% of 1000 = 150.00

        PriceRule platformFeeRule = new PriceRule();
        platformFeeRule.setCode("PLATFORM_FEE");
        platformFeeRule.setLabel("Platform Service Fee");
        platformFeeRule.setRuleType(PriceRuleType.PERCENTAGE);
        platformFeeRule.setValue(new BigDecimal("5.00")); // 5% of 1000 = 50.00

        PriceRule conservationFeeRule = new PriceRule();
        conservationFeeRule.setCode("COMMUNITY_FUND");
        conservationFeeRule.setLabel("Community Conservation Contribution");
        conservationFeeRule.setRuleType(PriceRuleType.FIXED_AMOUNT);
        conservationFeeRule.setValue(new BigDecimal("75.00")); // Fixed 75.00

        when(priceRuleRepository.findActiveRules(eq(enterpriseId), eq("TOURISM_PACKAGE"), any(Instant.class)))
                .thenReturn(List.of(vatRule, platformFeeRule, conservationFeeRule));

        PriceBreakdownResponse response = pricingEngine.calculatePricing(
                base, enterpriseId, "TOURISM_PACKAGE", Instant.now()
        );

        assertThat(response.subtotal()).isEqualByComparingTo("1000.00");
        assertThat(response.breakdown()).hasSize(3);

        // VAT
        assertThat(response.breakdown().get(0).amount()).isEqualByComparingTo("150.00");
        // Platform Fee
        assertThat(response.breakdown().get(1).amount()).isEqualByComparingTo("50.00");
        // Community Fund
        assertThat(response.breakdown().get(2).amount()).isEqualByComparingTo("75.00");

        // Total = 1000 + 150 + 50 + 75 = 1275.00
        assertThat(response.total()).isEqualByComparingTo("1275.00");
        assertThat(response.currency()).isEqualTo("ETB");
    }
}
