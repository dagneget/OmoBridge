package com.omobridge.products.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.util.MoneyUtil;
import com.omobridge.pricing.domain.PriceRule;
import com.omobridge.pricing.domain.PriceRuleRepository;
import com.omobridge.pricing.domain.PriceRuleType;
import com.omobridge.products.domain.Product;
import com.omobridge.products.domain.ProductPriceBreakdown;
import com.omobridge.products.domain.ProductPriceBreakdownRepository;
import com.omobridge.traceability.domain.ProductionBatch;
import com.omobridge.traceability.domain.ProductionInput;
import com.omobridge.traceability.domain.ProductionOutput;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductPricingService {

    private final ProductPriceBreakdownRepository priceBreakdownRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final AuditService auditService;

    @Transactional
    public ProductPriceBreakdown calculateAndSaveBreakdown(
            Product product,
            ProductionOutput output,
            BigDecimal transportCost,
            BigDecimal marginRate
    ) {
        BigDecimal packSize = product.getPackSize() != null && product.getPackSize().compareTo(BigDecimal.ZERO) > 0
                ? product.getPackSize()
                : BigDecimal.ONE;

        BigDecimal unitPurchaseCost = BigDecimal.ZERO;
        BigDecimal unitProcessing = BigDecimal.ZERO;
        BigDecimal unitPackaging = BigDecimal.ZERO;
        BigDecimal unitLabor = BigDecimal.ZERO;

        if (output != null && output.getBatch() != null) {
            ProductionBatch batch = output.getBatch();

            BigDecimal totalOutputQty = batch.getOutputs().stream()
                    .map(ProductionOutput::getQuantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (totalOutputQty.compareTo(BigDecimal.ZERO) <= 0) {
                totalOutputQty = BigDecimal.ONE;
            }

            // Weighted purchase cost from input lots
            BigDecimal totalInputCost = BigDecimal.ZERO;
            for (ProductionInput input : batch.getInputs()) {
                BigDecimal lotUnitPrice = BigDecimal.ZERO;
                if (input.getLot() != null && input.getLot().getSourceDeliveryItem() != null) {
                    lotUnitPrice = input.getLot().getSourceDeliveryItem().getUnitPriceSnapshot();
                }
                totalInputCost = totalInputCost.add(input.getQuantity().multiply(lotUnitPrice));
            }

            unitPurchaseCost = totalInputCost.divide(totalOutputQty, 4, RoundingMode.HALF_UP);
            unitProcessing = batch.getProcessingCost().divide(totalOutputQty, 4, RoundingMode.HALF_UP);
            unitPackaging = batch.getPackagingCost().divide(totalOutputQty, 4, RoundingMode.HALF_UP);
            unitLabor = batch.getLaborCost().divide(totalOutputQty, 4, RoundingMode.HALF_UP);
        }

        BigDecimal perPackPurchase = MoneyUtil.roundMoney(unitPurchaseCost.multiply(packSize));
        BigDecimal perPackProcessing = MoneyUtil.roundMoney(unitProcessing.multiply(packSize));
        BigDecimal perPackPackaging = MoneyUtil.roundMoney(unitPackaging.multiply(packSize));
        BigDecimal perPackLabor = MoneyUtil.roundMoney(unitLabor.multiply(packSize));
        BigDecimal perPackTransport = transportCost != null ? MoneyUtil.roundMoney(transportCost) : BigDecimal.ZERO;

        BigDecimal directCost = perPackPurchase.add(perPackProcessing)
                .add(perPackPackaging)
                .add(perPackLabor)
                .add(perPackTransport);

        // Enterprise margin
        BigDecimal effectiveMarginRate = marginRate != null && marginRate.compareTo(BigDecimal.ZERO) >= 0
                ? marginRate
                : new BigDecimal("0.15"); // default 15%
        BigDecimal enterpriseMargin = MoneyUtil.roundMoney(directCost.multiply(effectiveMarginRate));

        BigDecimal subtotal = directCost.add(enterpriseMargin);

        // Active price rules from common pricing
        List<PriceRule> rules = priceRuleRepository.findActiveRules(product.getEnterprise().getId(), "COMMODITY", Instant.now());

        BigDecimal communityFund = BigDecimal.ZERO;
        BigDecimal platformFee = BigDecimal.ZERO;
        BigDecimal taxAmount = BigDecimal.ZERO;

        for (PriceRule rule : rules) {
            String ruleCode = rule.getCode().toUpperCase();
            BigDecimal ruleAmount = (rule.getRuleType() == PriceRuleType.PERCENTAGE)
                    ? subtotal.multiply(rule.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                    : MoneyUtil.roundMoney(rule.getValue());

            if (ruleCode.contains("COMMUNITY")) {
                communityFund = communityFund.add(ruleAmount);
            } else if (ruleCode.contains("PLATFORM")) {
                platformFee = platformFee.add(ruleAmount);
            } else if (ruleCode.contains("TAX") || ruleCode.contains("VAT")) {
                taxAmount = taxAmount.add(ruleAmount);
            }
        }

        // Defaults if no specific rules are seeded
        if (communityFund.compareTo(BigDecimal.ZERO) == 0) {
            communityFund = MoneyUtil.roundMoney(subtotal.multiply(new BigDecimal("0.03"))); // 3% community fund
        }
        if (platformFee.compareTo(BigDecimal.ZERO) == 0) {
            platformFee = MoneyUtil.roundMoney(subtotal.multiply(new BigDecimal("0.05"))); // 5% platform fee
        }
        if (taxAmount.compareTo(BigDecimal.ZERO) == 0) {
            taxAmount = MoneyUtil.roundMoney(subtotal.multiply(new BigDecimal("0.15"))); // 15% standard Ethiopian VAT
        }

        BigDecimal totalPrice = subtotal.add(communityFund).add(platformFee).add(taxAmount);

        ProductPriceBreakdown breakdown = priceBreakdownRepository.findByProductId(product.getId())
                .orElseGet(() -> {
                    ProductPriceBreakdown pb = new ProductPriceBreakdown();
                    pb.setProduct(product);
                    return pb;
                });

        breakdown.setPurchaseCost(perPackPurchase);
        breakdown.setProcessingCost(perPackProcessing);
        breakdown.setPackagingCost(perPackPackaging);
        breakdown.setLaborCost(perPackLabor);
        breakdown.setTransportCost(perPackTransport);
        breakdown.setEnterpriseMargin(enterpriseMargin);
        breakdown.setCommunityFund(communityFund);
        breakdown.setPlatformFee(platformFee);
        breakdown.setTaxAmount(taxAmount);
        breakdown.setTotalPrice(totalPrice);

        ProductPriceBreakdown saved = priceBreakdownRepository.save(breakdown);

        product.setUnitPrice(totalPrice);
        product.setPriceBreakdown(saved);

        auditService.recordInCurrentTransaction(
                "CALCULATE_PRODUCT_PRICE_BREAKDOWN",
                "PRODUCT",
                product.getId(),
                Map.of("sku", product.getSku(), "totalPrice", totalPrice.toPlainString(), "margin", enterpriseMargin.toPlainString())
        );

        return saved;
    }
}
