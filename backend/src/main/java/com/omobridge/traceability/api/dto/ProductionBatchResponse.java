package com.omobridge.traceability.api.dto;

import com.omobridge.traceability.domain.BatchStatus;
import com.omobridge.traceability.domain.ProductionBatch;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProductionBatchResponse(
        UUID id,
        String batchCode,
        UUID enterpriseId,
        BatchStatus status,
        Instant processedAt,
        BigDecimal laborCost,
        BigDecimal processingCost,
        BigDecimal packagingCost,
        String notes,
        List<ProductionInputResponse> inputs,
        List<ProductionOutputResponse> outputs,
        List<ProductionLossResponse> losses,
        String traceToken,
        Instant createdAt
) {
    public static ProductionBatchResponse fromEntity(ProductionBatch batch) {
        return new ProductionBatchResponse(
                batch.getId(),
                batch.getBatchCode(),
                batch.getEnterprise().getId(),
                batch.getStatus(),
                batch.getProcessedAt(),
                batch.getLaborCost(),
                batch.getProcessingCost(),
                batch.getPackagingCost(),
                batch.getNotes(),
                batch.getInputs().stream()
                        .map(i -> new ProductionInputResponse(
                                i.getId(),
                                i.getLot().getId(),
                                i.getLot().getLotCode(),
                                i.getQuantity(),
                                i.getUnit()))
                        .toList(),
                batch.getOutputs().stream()
                        .map(o -> new ProductionOutputResponse(
                                o.getId(),
                                o.getProductType().getId(),
                                o.getProductType().getName(),
                                o.getQuantity(),
                                o.getUnit(),
                                o.getGrade(),
                                o.getResultingLot() != null ? o.getResultingLot().getId() : null))
                        .toList(),
                batch.getLosses().stream()
                        .map(l -> new ProductionLossResponse(
                                l.getId(),
                                l.getQuantity(),
                                l.getUnit(),
                                l.getReason()))
                        .toList(),
                batch.getTraceRecord() != null ? batch.getTraceRecord().getPublicToken() : null,
                batch.getCreatedAt()
        );
    }
}
