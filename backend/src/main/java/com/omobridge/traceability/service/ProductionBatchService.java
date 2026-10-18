package com.omobridge.traceability.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.outbox.TransactionalOutboxService;
import com.omobridge.common.util.CodeGenerator;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.User;
import com.omobridge.inventory.api.dto.InventoryAdjustmentRequest;
import com.omobridge.inventory.domain.InventoryLocation;
import com.omobridge.inventory.domain.InventoryLocationRepository;
import com.omobridge.inventory.domain.InventoryLot;
import com.omobridge.inventory.domain.InventoryLotRepository;
import com.omobridge.inventory.domain.LotStatus;
import com.omobridge.inventory.service.InventoryService;
import com.omobridge.supply.domain.ProductType;
import com.omobridge.supply.domain.ProductTypeRepository;
import com.omobridge.traceability.api.dto.ProductionBatchCreateRequest;
import com.omobridge.traceability.api.dto.ProductionBatchResponse;
import com.omobridge.traceability.api.dto.ProductionInputRequest;
import com.omobridge.traceability.api.dto.ProductionLossRequest;
import com.omobridge.traceability.api.dto.ProductionOutputRequest;
import com.omobridge.traceability.domain.BatchStatus;
import com.omobridge.traceability.domain.ProductionBatch;
import com.omobridge.traceability.domain.ProductionBatchRepository;
import com.omobridge.traceability.domain.ProductionInput;
import com.omobridge.traceability.domain.ProductionInputRepository;
import com.omobridge.traceability.domain.ProductionLoss;
import com.omobridge.traceability.domain.ProductionOutput;
import com.omobridge.traceability.domain.TraceRecord;
import com.omobridge.traceability.domain.TraceRecordRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductionBatchService {

    private final ProductionBatchRepository batchRepository;
    private final ProductionInputRepository inputRepository;
    private final TraceRecordRepository traceRecordRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final InventoryLotRepository lotRepository;
    private final InventoryLocationRepository locationRepository;
    private final ProductTypeRepository productTypeRepository;
    private final InventoryService inventoryService;
    private final CodeGenerator codeGenerator;
    private final AuditService auditService;
    private final TransactionalOutboxService outboxService;

    @Transactional
    public ProductionBatchResponse createBatch(UUID enterpriseId, ProductionBatchCreateRequest request, User actor) {
        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with id: " + enterpriseId));

        if (request.inputs() == null || request.inputs().isEmpty()) {
            throw new BusinessRuleException("A production batch must contain at least one input lot");
        }
        if (request.outputs() == null || request.outputs().isEmpty()) {
            throw new BusinessRuleException("A production batch must contain at least one output product");
        }

        // B-602: Conservation of mass validation in compatible units
        validateUnitBalance(request);

        String batchCode = "BATCH-" + codeGenerator.generateReceiptNumber().replace("REC-", "");
        ProductionBatch batch = new ProductionBatch();
        batch.setBatchCode(batchCode);
        batch.setEnterprise(enterprise);
        batch.setLaborCost(request.laborCost() != null ? request.laborCost() : BigDecimal.ZERO);
        batch.setProcessingCost(request.processingCost() != null ? request.processingCost() : BigDecimal.ZERO);
        batch.setPackagingCost(request.packagingCost() != null ? request.packagingCost() : BigDecimal.ZERO);
        batch.setNotes(request.notes());
        batch.setStatus(request.completeImmediately() ? BatchStatus.COMPLETED : BatchStatus.DRAFT);
        if (request.completeImmediately()) {
            batch.setProcessedAt(Instant.now());
        }

        ProductionBatch savedBatch = batchRepository.save(batch);

        // 1. Process Inputs through InventoryService (locks and consumes each lot)
        for (ProductionInputRequest inReq : request.inputs()) {
            InventoryLot lot = lotRepository.findById(inReq.lotId())
                    .orElseThrow(() -> new ResourceNotFoundException("Input lot not found: " + inReq.lotId()));

            if (!lot.getEnterprise().getId().equals(enterpriseId)) {
                throw new BusinessRuleException("Cannot use lot from another enterprise: " + lot.getLotCode());
            }

            inventoryService.consume(
                    lot.getId(),
                    inReq.quantity(),
                    "PRODUCTION_BATCH",
                    savedBatch.getId(),
                    "Input consumed for batch " + batchCode,
                    actor
            );

            ProductionInput input = new ProductionInput();
            input.setLot(lot);
            input.setQuantity(inReq.quantity());
            input.setUnit(inReq.unit());
            savedBatch.addInput(input);
        }

        // 2. Process Outputs and optionally create output inventory lots
        for (ProductionOutputRequest outReq : request.outputs()) {
            ProductType pt = productTypeRepository.findById(outReq.productTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Output product type not found: " + outReq.productTypeId()));

            ProductionOutput output = new ProductionOutput();
            output.setProductType(pt);
            output.setQuantity(outReq.quantity());
            output.setUnit(outReq.unit());
            output.setGrade(outReq.grade());

            if (outReq.createInventoryLot()) {
                InventoryLocation targetLoc = outReq.targetLocationId() != null
                        ? locationRepository.findByIdAndEnterpriseId(outReq.targetLocationId(), enterpriseId)
                                .orElseThrow(() -> new ResourceNotFoundException("Target location not found: " + outReq.targetLocationId()))
                        : locationRepository.findFirstByEnterpriseId(enterpriseId)
                                .orElseThrow(() -> new BusinessRuleException("No inventory location found for enterprise to store output lot"));

                InventoryLot outLot = inventoryService.receiveLot(
                        enterprise,
                        targetLoc,
                        pt,
                        null,
                        outReq.grade(),
                        outReq.quantity(),
                        outReq.unit(),
                        "Production batch output from " + batchCode,
                        actor
                );
                output.setResultingLot(outLot);
            }

            savedBatch.addOutput(output);
        }

        // 3. Process Losses
        if (request.losses() != null) {
            for (ProductionLossRequest lossReq : request.losses()) {
                ProductionLoss loss = new ProductionLoss();
                loss.setQuantity(lossReq.quantity());
                loss.setUnit(lossReq.unit());
                loss.setReason(lossReq.reason());
                savedBatch.addLoss(loss);
            }
        }

        // 4. Create TraceRecord
        String publicToken = UUID.randomUUID().toString().replace("-", "") +
                Long.toHexString(System.currentTimeMillis());

        TraceRecord traceRecord = new TraceRecord();
        traceRecord.setBatch(savedBatch);
        traceRecord.setPublicToken(publicToken);
        traceRecord.setOriginVillage(request.originVillage() != null ? request.originVillage() : "South Omo Community");
        traceRecord.setOriginLabel(request.originLabel() != null ? request.originLabel() : enterprise.getName());
        traceRecord.setProcessingDate(batch.getProcessedAt() != null ? batch.getProcessedAt() : Instant.now());
        traceRecord.setPublicStory(request.publicStory());
        traceRecord.setShowFarmerNames(request.showFarmerNames());
        traceRecordRepository.save(traceRecord);

        savedBatch.setTraceRecord(traceRecord);
        ProductionBatch finalSaved = batchRepository.save(savedBatch);

        auditService.recordInCurrentTransaction(
                "CREATE_PRODUCTION_BATCH",
                "PRODUCTION_BATCH",
                finalSaved.getId(),
                Map.of("batchCode", batchCode, "status", finalSaved.getStatus().name(), "token", publicToken)
        );

        outboxService.publishInTransaction(
                "PRODUCTION_BATCH_CREATED",
                "PRODUCTION_BATCH",
                finalSaved.getId(),
                Map.of("batchCode", batchCode, "token", publicToken)
        );

        return ProductionBatchResponse.fromEntity(finalSaved);
    }

    private void validateUnitBalance(ProductionBatchCreateRequest request) {
        String baseUnit = request.inputs().get(0).unit();
        boolean allInputsSameUnit = request.inputs().stream().allMatch(i -> i.unit().equalsIgnoreCase(baseUnit));
        boolean allOutputsSameUnit = request.outputs().stream().allMatch(o -> o.unit().equalsIgnoreCase(baseUnit));
        boolean allLossesSameUnit = request.losses() == null || request.losses().stream().allMatch(l -> l.unit().equalsIgnoreCase(baseUnit));

        if (allInputsSameUnit && allOutputsSameUnit && allLossesSameUnit) {
            BigDecimal totalIn = request.inputs().stream()
                    .map(ProductionInputRequest::quantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalOut = request.outputs().stream()
                    .map(ProductionOutputRequest::quantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalLoss = request.losses() != null
                    ? request.losses().stream()
                            .map(ProductionLossRequest::quantity)
                            .reduce(BigDecimal.ZERO, BigDecimal::add)
                    : BigDecimal.ZERO;

            BigDecimal balance = totalIn.subtract(totalOut.add(totalLoss));
            if (balance.compareTo(BigDecimal.ZERO) != 0) {
                throw new BusinessRuleException(
                        "BATCH_IMBALANCE: Total inputs (" + totalIn + " " + baseUnit + ") must equal outputs (" +
                                totalOut + ") + losses (" + totalLoss + "). Discrepancy: " + balance + " " + baseUnit);
            }
        }
    }

    @Transactional
    public ProductionBatchResponse completeBatch(UUID batchId, UUID enterpriseId, User actor) {
        ProductionBatch batch = batchRepository.findWithDetailsById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + batchId));

        if (!batch.getEnterprise().getId().equals(enterpriseId)) {
            throw new BusinessRuleException("Cannot complete batch belonging to another enterprise");
        }

        if (batch.getStatus() != BatchStatus.DRAFT) {
            throw new BusinessRuleException("Only DRAFT batches can be completed. Current status: " + batch.getStatus());
        }

        batch.setStatus(BatchStatus.COMPLETED);
        batch.setProcessedAt(Instant.now());
        ProductionBatch saved = batchRepository.save(batch);

        auditService.recordInCurrentTransaction(
                "COMPLETE_PRODUCTION_BATCH",
                "PRODUCTION_BATCH",
                saved.getId(),
                Map.of("batchCode", saved.getBatchCode())
        );

        return ProductionBatchResponse.fromEntity(saved);
    }

    @Transactional
    public ProductionBatchResponse cancelBatch(UUID batchId, UUID enterpriseId, String reason, User actor) {
        ProductionBatch batch = batchRepository.findWithDetailsById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + batchId));

        if (!batch.getEnterprise().getId().equals(enterpriseId)) {
            throw new BusinessRuleException("Cannot cancel batch belonging to another enterprise");
        }

        if (batch.getStatus() == BatchStatus.CANCELLED) {
            throw new BusinessRuleException("Batch is already cancelled");
        }

        // B-603: Cancelling returns stock through reversal movements, never by editing history
        for (ProductionInput input : batch.getInputs()) {
            inventoryService.adjust(
                    input.getLot().getId(),
                    enterpriseId,
                    new InventoryAdjustmentRequest(input.getQuantity(), "Batch cancellation stock reversal for " + batch.getBatchCode()),
                    actor
            );
        }

        // Reverse outputs if resulting lots were created
        for (ProductionOutput output : batch.getOutputs()) {
            if (output.getResultingLot() != null) {
                inventoryService.adjust(
                        output.getResultingLot().getId(),
                        enterpriseId,
                        new InventoryAdjustmentRequest(output.getQuantity().negate(), "Batch cancellation output removal for " + batch.getBatchCode()),
                        actor
                );
            }
        }

        batch.setStatus(BatchStatus.CANCELLED);
        ProductionBatch saved = batchRepository.save(batch);

        auditService.recordInCurrentTransaction(
                "CANCEL_PRODUCTION_BATCH",
                "PRODUCTION_BATCH",
                saved.getId(),
                Map.of("batchCode", saved.getBatchCode(), "reason", reason != null ? reason : "Cancelled by user")
        );

        return ProductionBatchResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<ProductionBatchResponse> getBatches(UUID enterpriseId) {
        return batchRepository.findByEnterpriseId(enterpriseId).stream()
                .map(ProductionBatchResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductionBatchResponse getBatchById(UUID batchId, UUID enterpriseId) {
        ProductionBatch batch = batchRepository.findByIdAndEnterpriseId(batchId, enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));
        return ProductionBatchResponse.fromEntity(batch);
    }

    // B-604: Protect used lots
    public void validateLotNotUsedInProduction(UUID lotId) {
        if (inputRepository.existsByLotId(lotId)) {
            throw new BusinessRuleException("LOT_IN_USE: Lot " + lotId + " has been used in production batches and cannot be deleted or re-assigned");
        }
    }
}
