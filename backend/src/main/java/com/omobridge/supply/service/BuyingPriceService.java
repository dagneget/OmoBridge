package com.omobridge.supply.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.util.MoneyUtil;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.supply.api.dto.BuyingPriceRequest;
import com.omobridge.supply.api.dto.BuyingPriceResponse;
import com.omobridge.supply.domain.BuyingPrice;
import com.omobridge.supply.domain.BuyingPriceRepository;
import com.omobridge.supply.domain.ProductType;
import com.omobridge.supply.domain.ProductTypeRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BuyingPriceService {

    private final BuyingPriceRepository buyingPriceRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final ProductTypeRepository productTypeRepository;
    private final AuditService auditService;

    public List<BuyingPriceResponse> getActiveBuyingPrices(UUID enterpriseId) {
        return buyingPriceRepository.findAllByEnterpriseIdAndIsActiveTrue(enterpriseId)
                .stream()
                .map(BuyingPriceResponse::fromEntity)
                .toList();
    }

    @Transactional
    public BuyingPriceResponse createBuyingPrice(BuyingPriceRequest request) {
        Enterprise enterprise = enterpriseRepository.findById(request.enterpriseId())
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with id: " + request.enterpriseId()));

        ProductType productType = productTypeRepository.findById(request.productTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Product type not found with id: " + request.productTypeId()));

        Instant effectiveFrom = request.effectiveFrom() != null ? request.effectiveFrom() : Instant.now();

        BuyingPrice buyingPrice = new BuyingPrice();
        buyingPrice.setEnterprise(enterprise);
        buyingPrice.setProductType(productType);
        buyingPrice.setGrade(request.grade());
        buyingPrice.setPricePerUnit(MoneyUtil.roundMoney(request.pricePerUnit()));
        buyingPrice.setEffectiveFrom(effectiveFrom);
        buyingPrice.setEffectiveTo(request.effectiveTo());
        buyingPrice.setActive(true);

        BuyingPrice saved = buyingPriceRepository.save(buyingPrice);

        auditService.recordInCurrentTransaction(
                "CREATE_BUYING_PRICE",
                "BUYING_PRICE",
                saved.getId(),
                Map.of("enterpriseId", enterprise.getId().toString(),
                        "productType", productType.getCode(),
                        "grade", saved.getGrade(),
                        "price", saved.getPricePerUnit())
        );

        return BuyingPriceResponse.fromEntity(saved);
    }
}
