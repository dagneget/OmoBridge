package com.omobridge.products.api.dto;

import com.omobridge.products.domain.Product;
import com.omobridge.products.domain.ProductPriceBreakdown;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProductResponse(
        UUID id,
        UUID enterpriseId,
        String enterpriseName,
        String sku,
        String name,
        String description,
        String story,
        String category,
        String unit,
        BigDecimal packSize,
        BigDecimal unitPrice,
        String currency,
        UUID productionOutputId,
        BigDecimal stockOnHand,
        BigDecimal stockReserved,
        BigDecimal availableStock,
        boolean published,
        ProductPriceBreakdownResponse priceBreakdown,
        String traceToken,
        Instant createdAt
) {
    public static ProductResponse fromEntity(Product p) {
        ProductPriceBreakdown pb = p.getPriceBreakdown();
        ProductPriceBreakdownResponse pbResp = pb != null ? new ProductPriceBreakdownResponse(
                pb.getPurchaseCost(),
                pb.getProcessingCost(),
                pb.getPackagingCost(),
                pb.getLaborCost(),
                pb.getTransportCost(),
                pb.getEnterpriseMargin(),
                pb.getCommunityFund(),
                pb.getTaxAmount(),
                pb.getPlatformFee(),
                pb.getTotalPrice()
        ) : null;

        String token = null;
        if (p.getProductionOutput() != null &&
                p.getProductionOutput().getBatch() != null &&
                p.getProductionOutput().getBatch().getTraceRecord() != null) {
            token = p.getProductionOutput().getBatch().getTraceRecord().getPublicToken();
        }

        return new ProductResponse(
                p.getId(),
                p.getEnterprise().getId(),
                p.getEnterprise().getName(),
                p.getSku(),
                p.getName(),
                p.getDescription(),
                p.getStory(),
                p.getCategory(),
                p.getUnit(),
                p.getPackSize(),
                p.getUnitPrice(),
                p.getCurrency(),
                p.getProductionOutput() != null ? p.getProductionOutput().getId() : null,
                p.getStockOnHand(),
                p.getStockReserved(),
                p.getAvailableStock(),
                p.isPublished(),
                pbResp,
                token,
                p.getCreatedAt()
        );
    }
}
