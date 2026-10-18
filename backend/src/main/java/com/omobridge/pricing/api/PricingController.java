package com.omobridge.pricing.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.pricing.api.dto.PriceBreakdownResponse;
import com.omobridge.pricing.api.dto.PriceRuleRequest;
import com.omobridge.pricing.domain.PriceRule;
import com.omobridge.pricing.service.PriceRuleService;
import com.omobridge.pricing.service.PricingEngine;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Pricing & Rate Rules", description = "Endpoints for dynamic pricing breakdown and fee configuration")
public class PricingController {

    private final PricingEngine pricingEngine;
    private final PriceRuleService priceRuleService;

    @GetMapping("/pricing/calculate")
    @Operation(summary = "Calculate dynamic price breakdown for tourism, delivery, or produce")
    public ResponseEntity<ApiResponse<PriceBreakdownResponse>> calculatePricing(
            @RequestParam BigDecimal baseAmount,
            @RequestParam(required = false) UUID enterpriseId,
            @RequestParam(defaultValue = "TOURISM_PACKAGE") String appliesTo
    ) {
        PriceBreakdownResponse response = pricingEngine.calculatePricing(baseAmount, enterpriseId, appliesTo, Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/enterprises/{enterpriseId}/pricing/rules")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "List price rules configured for an enterprise")
    public ResponseEntity<ApiResponse<List<PriceRule>>> listRules(
            @PathVariable UUID enterpriseId,
            Authentication authentication
    ) {
        List<PriceRule> rules = priceRuleService.listRulesForEnterprise(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(rules));
    }

    @PostMapping("/enterprises/{enterpriseId}/pricing/rules")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Create a new price rule for an enterprise")
    public ResponseEntity<ApiResponse<PriceRule>> createRule(
            @PathVariable UUID enterpriseId,
            @Valid @RequestBody PriceRuleRequest request,
            Authentication authentication
    ) {
        PriceRule rule = priceRuleService.createRule(authentication, enterpriseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Price rule created successfully", rule));
    }

    @PutMapping("/enterprises/{enterpriseId}/pricing/rules/{ruleId}")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Update an existing price rule")
    public ResponseEntity<ApiResponse<PriceRule>> updateRule(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID ruleId,
            @Valid @RequestBody PriceRuleRequest request,
            Authentication authentication
    ) {
        PriceRule rule = priceRuleService.updateRule(authentication, ruleId, request);
        return ResponseEntity.ok(ApiResponse.ok("Price rule updated successfully", rule));
    }

    @DeleteMapping("/enterprises/{enterpriseId}/pricing/rules/{ruleId}")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Delete a price rule")
    public ResponseEntity<ApiResponse<Void>> deleteRule(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID ruleId,
            Authentication authentication
    ) {
        priceRuleService.deleteRule(authentication, ruleId);
        return ResponseEntity.ok(ApiResponse.ok("Price rule deleted successfully", null));
    }
}
