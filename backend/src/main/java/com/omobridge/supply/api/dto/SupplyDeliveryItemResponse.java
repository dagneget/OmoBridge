package com.omobridge.supply.api.dto;

import com.omobridge.supply.domain.SupplyDeliveryItem;
import java.math.BigDecimal;
import java.util.UUID;

public record SupplyDeliveryItemResponse(
        UUID id,
        UUID productTypeId,
        String productTypeCode,
        String productTypeName,
        String unit,
        String grade,
        BigDecimal deliveredQty,
        BigDecimal acceptedQty,
        BigDecimal rejectedQty,
        String rejectionReason,
        BigDecimal unitPriceSnapshot,
        BigDecimal lineTotal
) {
    public static SupplyDeliveryItemResponse fromEntity(SupplyDeliveryItem item) {
        return new SupplyDeliveryItemResponse(
                item.getId(),
                item.getProductType().getId(),
                item.getProductType().getCode(),
                item.getProductType().getName(),
                item.getProductType().getUnit(),
                item.getGrade(),
                item.getDeliveredQty(),
                item.getAcceptedQty(),
                item.getRejectedQty(),
                item.getRejectionReason(),
                item.getUnitPriceSnapshot(),
                item.getLineTotal()
        );
    }
}
