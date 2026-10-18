package com.omobridge.pricing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.common.BaseIntegrationTest;
import com.omobridge.common.audit.AuditLog;
import com.omobridge.common.audit.AuditLogRepository;
import com.omobridge.common.audit.AuditService;
import com.omobridge.common.idempotency.IdempotencyRecord;
import com.omobridge.common.idempotency.IdempotencyRecordRepository;
import com.omobridge.common.media.Media;
import com.omobridge.common.media.MediaRepository;
import com.omobridge.common.outbox.OutboxEvent;
import com.omobridge.common.outbox.OutboxEventRepository;
import com.omobridge.common.outbox.TransactionalOutboxService;
import com.omobridge.common.translation.Translation;
import com.omobridge.common.translation.TranslationRepository;
import com.omobridge.common.translation.TranslationService;
import com.omobridge.pricing.domain.PriceRule;
import com.omobridge.pricing.domain.PriceRuleRepository;
import com.omobridge.pricing.domain.PriceRuleType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class CommonDataAndPricingIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private TranslationRepository translationRepository;

    @Autowired
    private TranslationService translationService;

    @Autowired
    private MediaRepository mediaRepository;

    @Autowired
    private IdempotencyRecordRepository idempotencyRecordRepository;

    @Autowired
    private PriceRuleRepository priceRuleRepository;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private TransactionalOutboxService transactionalOutboxService;

    @Test
    @DisplayName("B-201 to B-206: Test common data, outbox, translations, and pricing engine")
    void testCommonDataAndPricing() throws Exception {
        UUID testEntityId = UUID.randomUUID();

        // 1. AuditLog
        AuditLog audit = auditService.record("PRICE_UPDATED", "TOUR_PACKAGE", testEntityId, Map.of("oldPrice", 100, "newPrice", 150));
        assertThat(audit.getId()).isNotNull();
        assertThat(auditLogRepository.findAllByEntityTypeAndEntityIdOrderByCreatedAtDesc("TOUR_PACKAGE", testEntityId)).hasSize(1);

        // 2. Translation
        Translation translation = translationService.setTranslation("TOUR_PACKAGE", testEntityId, "title", "am", "የሐመር የገበያ ጉብኝት");
        assertThat(translation.getId()).isNotNull();
        assertThat(translationService.getTranslatedField("TOUR_PACKAGE", testEntityId, "title", "am", "Default")).isEqualTo("የሐመር የገበያ ጉብኝት");

        // 3. Media
        Media media = new Media();
        media.setOwnerType("TOUR_PACKAGE");
        media.setOwnerId(testEntityId);
        media.setUrl("https://cdn.omobridge.et/photos/hamer1.jpg");
        media.setKind("IMAGE");
        media.setSortOrder(1);
        media.setPrimary(true);
        media = mediaRepository.save(media);
        assertThat(media.getId()).isNotNull();

        // 4. Idempotency Key
        IdempotencyRecord idemp = new IdempotencyRecord();
        idemp.setIdempotencyKey("checkout-key-999");
        idemp.setScope("CHECKOUT");
        idemp.setRequestHash("hash-abc-123");
        idemp = idempotencyRecordRepository.save(idemp);
        assertThat(idemp.getId()).isNotNull();

        // 5. Transactional Outbox
        OutboxEvent outbox = transactionalOutboxService.publish("ORDER_CONFIRMED", "ORDER", testEntityId, Map.of("amount", 2500));
        assertThat(outbox.getId()).isNotNull();
        assertThat(outboxEventRepository.findAllByAggregateTypeAndAggregateIdOrderByCreatedAtAsc("ORDER", testEntityId)).hasSize(1);

        // 6. Price Rule & Pricing Engine Calculation
        PriceRule globalTax = new PriceRule();
        globalTax.setCode("REG_TAX_10");
        globalTax.setLabel("Regional Tourism Tax");
        globalTax.setRuleType(PriceRuleType.PERCENTAGE);
        globalTax.setValue(new BigDecimal("10.00"));
        globalTax.setAppliesTo("TOURISM_PACKAGE");
        globalTax.setChargedTo("BUYER");
        globalTax.setEffectiveFrom(Instant.now().minusSeconds(3600));
        globalTax.setActive(true);
        priceRuleRepository.save(globalTax);

        // Call GET /api/v1/pricing/calculate?baseAmount=500&appliesTo=TOURISM_PACKAGE
        mockMvc.perform(get("/api/v1/pricing/calculate")
                        .param("baseAmount", "500.00")
                        .param("appliesTo", "TOURISM_PACKAGE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.subtotal").value(500.00))
                .andExpect(jsonPath("$.data.total").value(550.00)) // 500 + 10% (50.00) = 550.00
                .andExpect(jsonPath("$.data.currency").value("ETB"));
    }
}
