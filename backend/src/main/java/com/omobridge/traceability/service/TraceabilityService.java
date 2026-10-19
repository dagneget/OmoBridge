package com.omobridge.traceability.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.identity.domain.Farmer;
import com.omobridge.inventory.domain.InventoryLot;
import com.omobridge.traceability.api.dto.PublicFarmerOriginResponse;
import com.omobridge.traceability.api.dto.PublicOutputItemResponse;
import com.omobridge.traceability.api.dto.PublicTraceResponse;
import com.omobridge.traceability.api.dto.TraceRecordUpdateRequest;
import com.omobridge.traceability.api.dto.TraceValidationResponse;
import com.omobridge.traceability.domain.ProductionBatch;
import com.omobridge.traceability.domain.ProductionBatchRepository;
import com.omobridge.traceability.domain.ProductionInput;
import com.omobridge.traceability.domain.TraceRecord;
import com.omobridge.traceability.domain.TraceRecordRepository;
import com.omobridge.traceability.domain.TraceScan;
import com.omobridge.traceability.domain.TraceScanRepository;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TraceabilityService {

    private final TraceRecordRepository traceRecordRepository;
    private final TraceScanRepository traceScanRepository;
    private final ProductionBatchRepository batchRepository;

    @Value("${app.traceability.base-url:https://omobridge.et/trace/}")
    private String traceBaseUrl;

    @Transactional
    public PublicTraceResponse getPublicTrace(String publicToken, String ipAddress, String userAgent) {
        TraceRecord record = traceRecordRepository.findWithFullTraceByPublicToken(publicToken)
                .orElseThrow(() -> new ResourceNotFoundException("Trace record not found for token: " + publicToken));

        // Record scan log
        TraceScan scan = new TraceScan();
        scan.setTraceRecord(record);
        scan.setScannedAt(Instant.now());
        scan.setIpAddress(ipAddress);
        scan.setUserAgent(userAgent);
        traceScanRepository.save(scan);

        ProductionBatch batch = record.getBatch();

        // B-605: Farmer consent check (both traceRecord.showFarmerNames and farmer.consentPublicName must be true)
        boolean showFarmerNames = record.isShowFarmerNames();
        Set<String> seenOrigins = new HashSet<>();
        List<PublicFarmerOriginResponse> farmerOrigins = new ArrayList<>();

        for (ProductionInput in : batch.getInputs()) {
            InventoryLot lot = in.getLot();
            if (lot != null && lot.getSourceDeliveryItem() != null &&
                    lot.getSourceDeliveryItem().getDelivery() != null &&
                    lot.getSourceDeliveryItem().getDelivery().getFarmer() != null) {

                Farmer farmer = lot.getSourceDeliveryItem().getDelivery().getFarmer();
                String displayName = (showFarmerNames && farmer.isConsentPublicName() && farmer.getUser() != null)
                        ? farmer.getUser().getFullName()
                        : null;

                String groupName = farmer.getEnterprise() != null ? farmer.getEnterprise().getName()
                        : (farmer.getKebele() != null ? farmer.getKebele() : "Local Community Group");

                String key = farmer.getVillage() + "|" + groupName + "|" + displayName;
                if (!seenOrigins.contains(key)) {
                    seenOrigins.add(key);
                    farmerOrigins.add(new PublicFarmerOriginResponse(
                            farmer.getVillage(),
                            groupName,
                            displayName
                    ));
                }
            }
        }

        List<PublicOutputItemResponse> outputs = batch.getOutputs().stream()
                .map(o -> new PublicOutputItemResponse(
                        o.getProductType().getName(),
                        o.getQuantity(),
                        o.getUnit(),
                        o.getGrade()))
                .toList();

        long scanCount = traceScanRepository.countByTraceRecordId(record.getId());

        return new PublicTraceResponse(
                record.getPublicToken(),
                batch.getBatchCode(),
                batch.getEnterprise().getName(),
                record.getOriginVillage(),
                record.getOriginLabel(),
                record.getProcessingDate(),
                record.getPublicStory(),
                farmerOrigins,
                outputs,
                scanCount
        );
    }

    @Transactional(readOnly = true)
    public TraceValidationResponse validateTrace(UUID batchId) {
        ProductionBatch batch = batchRepository.findWithDetailsById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + batchId));

        List<String> issues = new ArrayList<>();
        Set<UUID> farmerIds = new HashSet<>();
        int inputLotCount = batch.getInputs().size();

        if (batch.getInputs().isEmpty()) {
            issues.add("Batch has zero inputs");
        }

        for (ProductionInput in : batch.getInputs()) {
            InventoryLot lot = in.getLot();
            if (lot == null) {
                issues.add("Input record missing inventory lot");
                continue;
            }
            if (lot.getSourceDeliveryItem() == null) {
                issues.add("Lot " + lot.getLotCode() + " has no source delivery item");
            } else if (lot.getSourceDeliveryItem().getDelivery() == null) {
                issues.add("Delivery item " + lot.getSourceDeliveryItem().getId() + " has no parent delivery");
            } else if (lot.getSourceDeliveryItem().getDelivery().getFarmer() == null) {
                issues.add("Delivery has no associated farmer");
            } else {
                farmerIds.add(lot.getSourceDeliveryItem().getDelivery().getFarmer().getId());
            }
        }

        boolean valid = issues.isEmpty();
        String note = valid ? "Full chain of custody verified from farmer delivery to finished outputs"
                : "Broken traceability chain detected: " + String.join("; ", issues);

        return new TraceValidationResponse(
                valid,
                note,
                issues,
                inputLotCount,
                farmerIds.size()
        );
    }

    // B-607: QR code generation
    public byte[] generateQrCodeImage(String publicToken, int width, int height) {
        try {
            String url = traceBaseUrl + publicToken;
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(url, BarcodeFormat.QR_CODE, width, height);
            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
            return pngOutputStream.toByteArray();
        } catch (Exception ex) {
            log.error("Failed to generate QR code for token {}: {}", publicToken, ex.getMessage());
            throw new BusinessRuleException("Failed to generate QR code image: " + ex.getMessage());
        }
    }

    @Transactional
    public TraceRecord updateTraceRecord(UUID batchId, UUID enterpriseId, TraceRecordUpdateRequest request) {
        TraceRecord record = traceRecordRepository.findByBatchId(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Trace record not found for batch: " + batchId));

        if (!record.getBatch().getEnterprise().getId().equals(enterpriseId)) {
            throw new BusinessRuleException("Cannot update trace record belonging to another enterprise");
        }

        if (request.originVillage() != null) record.setOriginVillage(request.originVillage());
        if (request.originLabel() != null) record.setOriginLabel(request.originLabel());
        if (request.publicStory() != null) record.setPublicStory(request.publicStory());
        if (request.showFarmerNames() != null) record.setShowFarmerNames(request.showFarmerNames());

        return traceRecordRepository.save(record);
    }
}
