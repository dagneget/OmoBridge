package com.omobridge.pricing.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.pricing.api.dto.PriceRuleRequest;
import com.omobridge.pricing.domain.PriceRule;
import com.omobridge.pricing.domain.PriceRuleRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PriceRuleService {

    private final PriceRuleRepository priceRuleRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final OwnershipService ownershipService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<PriceRule> listRulesForEnterprise(Authentication authentication, UUID enterpriseId) {
        verifyAccess(authentication, enterpriseId);
        return priceRuleRepository.findAllByEnterpriseId(enterpriseId);
    }

    @Transactional
    public PriceRule createRule(Authentication authentication, UUID enterpriseId, PriceRuleRequest request) {
        verifyAccess(authentication, enterpriseId);

        Enterprise enterprise = enterpriseId != null
                ? enterpriseRepository.findById(enterpriseId)
                        .orElseThrow(() -> new ResourceNotFoundException("Enterprise", enterpriseId))
                : null;

        PriceRule rule = new PriceRule();
        rule.setEnterprise(enterprise);
        rule.setCode(request.code().toUpperCase().trim());
        rule.setLabel(request.label().trim());
        rule.setRuleType(request.ruleType());
        rule.setValue(request.value());
        rule.setAppliesTo(request.appliesTo().toUpperCase().trim());
        rule.setChargedTo(request.chargedTo().toUpperCase().trim());
        rule.setEffectiveFrom(request.effectiveFrom() != null ? request.effectiveFrom() : Instant.now());
        rule.setEffectiveTo(request.effectiveTo());
        rule.setActive(request.isActive() == null || request.isActive());

        PriceRule saved = priceRuleRepository.save(rule);

        auditService.record(
                "CREATE_PRICE_RULE",
                "PRICE_RULE",
                saved.getId(),
                request
        );

        return saved;
    }

    @Transactional
    public PriceRule updateRule(Authentication authentication, UUID ruleId, PriceRuleRequest request) {
        PriceRule rule = priceRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("PriceRule", ruleId));

        if (rule.getEnterprise() != null) {
            verifyAccess(authentication, rule.getEnterprise().getId());
        }

        rule.setLabel(request.label().trim());
        rule.setRuleType(request.ruleType());
        rule.setValue(request.value());
        rule.setAppliesTo(request.appliesTo().toUpperCase().trim());
        rule.setChargedTo(request.chargedTo().toUpperCase().trim());
        if (request.effectiveFrom() != null) {
            rule.setEffectiveFrom(request.effectiveFrom());
        }
        rule.setEffectiveTo(request.effectiveTo());
        if (request.isActive() != null) {
            rule.setActive(request.isActive());
        }

        PriceRule saved = priceRuleRepository.save(rule);

        auditService.record(
                "UPDATE_PRICE_RULE",
                "PRICE_RULE",
                saved.getId(),
                request
        );

        return saved;
    }

    @Transactional
    public void deleteRule(Authentication authentication, UUID ruleId) {
        PriceRule rule = priceRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("PriceRule", ruleId));

        if (rule.getEnterprise() != null) {
            verifyAccess(authentication, rule.getEnterprise().getId());
        }

        priceRuleRepository.delete(rule);

        auditService.record(
                "DELETE_PRICE_RULE",
                "PRICE_RULE",
                ruleId,
                "Deleted rule: " + rule.getCode()
        );
    }

    private void verifyAccess(Authentication authentication, UUID enterpriseId) {
        if (enterpriseId != null && !ownershipService.isEnterpriseMember(authentication, enterpriseId)) {
            throw new ForbiddenException("Access denied: You are not an active member of this enterprise");
        }
    }
}
