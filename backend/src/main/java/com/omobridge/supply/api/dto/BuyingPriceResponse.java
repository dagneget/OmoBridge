package com.omobridge.supply.api.dto;

import com.omobridge.supply.domain.BuyingPrice;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record BuyingPriceResponse(
        UUID id,
        UUID enterpriseId,
        String enterpriseName,
        UUID productTypeId,
        String productTypeCode,
        String productTypeName,
        String unit,
        String grade,
        BigDecimal pricePerUnit,
        Instant effectiveFrom,
        Instant effectiveTo,
        boolean isActive
) {
    public static BuyingPriceResponse fromEntity(BuyingPrice bp) {
        return new BuyingPriceResponse(
                bp.getId(),
                bp.getEnterprise().getId(),
                bp.getEnterprise().getName(),
                bp.getProductType().getId(),
                bp.getProductType().getCode(),
                bp.getProductType().getName(),
                bp.getProductType().getUnit(),
                bp.getGrade(),
                bp.getPricePerUnit(),
                bp.getEffectiveFrom(),
                bp.getEffectiveTo(),
                bp.isActive()
        );
    }
}
