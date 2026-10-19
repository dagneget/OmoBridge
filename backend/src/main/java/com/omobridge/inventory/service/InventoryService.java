package com.omobridge.inventory.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.util.CodeGenerator;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.inventory.api.dto.InventoryAdjustmentRequest;
import com.omobridge.inventory.api.dto.InventoryDisposalRequest;
import com.omobridge.inventory.api.dto.InventoryLocationRequest;
import com.omobridge.inventory.api.dto.InventoryLocationResponse;
import com.omobridge.inventory.api.dto.InventoryLotResponse;
import com.omobridge.inventory.api.dto.InventoryMovementResponse;
import com.omobridge.inventory.api.dto.InventoryTransferRequest;
import com.omobridge.inventory.api.dto.ReconciliationReportResponse;
import com.omobridge.inventory.domain.InventoryLocation;
import com.omobridge.inventory.domain.InventoryLocationRepository;
import com.omobridge.inventory.domain.InventoryLot;
import com.omobridge.inventory.domain.InventoryLotRepository;
import com.omobridge.inventory.domain.InventoryMovement;
import com.omobridge.inventory.domain.InventoryMovementRepository;
import com.omobridge.inventory.domain.LotStatus;
import com.omobridge.inventory.domain.MovementType;
import com.omobridge.supply.domain.ProductType;
import com.omobridge.supply.domain.SupplyDeliveryItem;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryLocationRepository locationRepository;
    private final InventoryLotRepository lotRepository;
    private final InventoryMovementRepository movementRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final UserRepository userRepository;
    private final CodeGenerator codeGenerator;
    private final AuditService auditService;

    @Transactional
    public InventoryLocationResponse createLocation(UUID enterpriseId, InventoryLocationRequest request) {
        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with id: " + enterpriseId));

        InventoryLocation loc = new InventoryLocation();
        loc.setEnterprise(enterprise);
        loc.setName(request.name());
        loc.setLocationType(request.locationType());
        loc.setDescription(request.description());

        InventoryLocation saved = locationRepository.save(loc);
        return InventoryLocationResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<InventoryLocationResponse> getLocations(UUID enterpriseId) {
        return locationRepository.findByEnterpriseId(enterpriseId).stream()
                .map(InventoryLocationResponse::fromEntity)
                .toList();
    }

    @Transactional
    public InventoryLot receiveLot(
            Enterprise enterprise,
            InventoryLocation location,
            ProductType productType,
            SupplyDeliveryItem sourceDeliveryItem,
            String grade,
            BigDecimal quantity,
            String unit,
            String reason,
            User receivedByUser
    ) {
        String lotCode = "LOT-" + codeGenerator.generateReceiptNumber().replace("REC-", "");

        InventoryLot lot = new InventoryLot();
        lot.setLotCode(lotCode);
        lot.setEnterprise(enterprise);
        lot.setLocation(location);
        lot.setProductType(productType);
        lot.setSourceDeliveryItem(sourceDeliveryItem);
        lot.setGrade(grade != null ? grade : "STANDARD");
        lot.setReceivedQty(quantity);
        lot.setBalanceQty(quantity);
        lot.setUnit(unit != null ? unit : productType.getUnit());
        lot.setStatus(LotStatus.ACTIVE);
        lot.setReceivedAt(Instant.now());

        InventoryLot savedLot = lotRepository.save(lot);

        InventoryMovement movement = new InventoryMovement();
        movement.setLot(savedLot);
        movement.setMovementType(MovementType.RECEIPT);
        movement.setQuantity(quantity);
        movement.setBalanceAfter(quantity);
        movement.setReason(reason != null ? reason : "Initial lot receipt");
        if (sourceDeliveryItem != null) {
            movement.setReferenceType("SUPPLY_DELIVERY_ITEM");
            movement.setReferenceId(sourceDeliveryItem.getId());
        }
        movement.setCreatedByUser(receivedByUser);
        movement.setCreatedAt(Instant.now());
        movementRepository.save(movement);

        auditService.recordInCurrentTransaction(
                "RECEIVE_INVENTORY_LOT",
                "INVENTORY_LOT",
                savedLot.getId(),
                Map.of("lotCode", savedLot.getLotCode(), "qty", quantity.toPlainString())
        );

        return savedLot;
    }

    @Transactional
    public InventoryLot receiveFromSupplyDelivery(
            Enterprise enterprise,
            SupplyDeliveryItem deliveryItem,
            BigDecimal acceptedQty,
            User receivedByUser
    ) {
        InventoryLocation location = locationRepository.findFirstByEnterpriseId(enterprise.getId())
                .orElseGet(() -> {
                    InventoryLocation defLoc = new InventoryLocation();
                    defLoc.setEnterprise(enterprise);
                    defLoc.setName("Main Receiving Facility");
                    defLoc.setLocationType("WAREHOUSE");
                    defLoc.setDescription("Default receiving location auto-created for supply intake");
                    return locationRepository.save(defLoc);
                });

        return receiveLot(
                enterprise,
                location,
                deliveryItem.getProductType(),
                deliveryItem,
                deliveryItem.getGrade(),
                acceptedQty,
                deliveryItem.getProductType().getUnit(),
                "Intake from supply delivery item " + deliveryItem.getId(),
                receivedByUser
        );
    }

    @Transactional
    public InventoryMovementResponse consume(
            UUID lotId,
            BigDecimal quantity,
            String referenceType,
            UUID referenceId,
            String reason,
            User user
    ) {
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("Consumption quantity must be greater than zero");
        }

        InventoryLot lot = lotRepository.findByIdWithLock(lotId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory lot not found with id: " + lotId));

        if (lot.getStatus() != LotStatus.ACTIVE) {
            throw new BusinessRuleException("Cannot consume from inactive lot. Current status: " + lot.getStatus());
        }

        if (lot.getBalanceQty().compareTo(quantity) < 0) {
            throw new BusinessRuleException(
                    "INSUFFICIENT_STOCK: Insufficient stock for lot " + lot.getLotCode() +
                            ". Available: " + lot.getBalanceQty() + ", requested: " + quantity);
        }

        BigDecimal newBalance = lot.getBalanceQty().subtract(quantity);
        lot.setBalanceQty(newBalance);
        if (newBalance.compareTo(BigDecimal.ZERO) == 0) {
            lot.setStatus(LotStatus.DEPLETED);
        }
        lotRepository.save(lot);

        InventoryMovement movement = new InventoryMovement();
        movement.setLot(lot);
        movement.setMovementType(MovementType.CONSUMPTION);
        movement.setQuantity(quantity.negate());
        movement.setBalanceAfter(newBalance);
        movement.setReason(reason);
        movement.setReferenceType(referenceType);
        movement.setReferenceId(referenceId);
        movement.setCreatedByUser(user);
        movement.setCreatedAt(Instant.now());
        InventoryMovement savedMovement = movementRepository.save(movement);

        auditService.recordInCurrentTransaction(
                "CONSUME_INVENTORY",
                "INVENTORY_LOT",
                lot.getId(),
                Map.of("lotCode", lot.getLotCode(), "consumedQty", quantity.toPlainString(), "balanceAfter", newBalance.toPlainString())
        );

        return InventoryMovementResponse.fromEntity(savedMovement);
    }

    @Transactional
    public InventoryMovementResponse adjust(
            UUID lotId,
            UUID enterpriseId,
            InventoryAdjustmentRequest request,
            User user
    ) {
        if (request.quantity() == null || request.quantity().compareTo(BigDecimal.ZERO) == 0) {
            throw new BusinessRuleException("Adjustment quantity cannot be zero");
        }

        InventoryLot lot = lotRepository.findByIdWithLock(lotId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory lot not found with id: " + lotId));

        if (!lot.getEnterprise().getId().equals(enterpriseId)) {
            throw new BusinessRuleException("Cannot adjust lot belonging to another enterprise");
        }

        BigDecimal newBalance = lot.getBalanceQty().add(request.quantity());
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessRuleException(
                    "INSUFFICIENT_STOCK: Adjustment would result in negative balance (" + newBalance + ") for lot " + lot.getLotCode());
        }

        lot.setBalanceQty(newBalance);
        if (newBalance.compareTo(BigDecimal.ZERO) == 0) {
            lot.setStatus(LotStatus.DEPLETED);
        } else if (lot.getStatus() == LotStatus.DEPLETED) {
            lot.setStatus(LotStatus.ACTIVE);
        }
        lotRepository.save(lot);

        InventoryMovement movement = new InventoryMovement();
        movement.setLot(lot);
        movement.setMovementType(MovementType.ADJUSTMENT);
        movement.setQuantity(request.quantity());
        movement.setBalanceAfter(newBalance);
        movement.setReason(request.reason());
        movement.setCreatedByUser(user);
        movement.setCreatedAt(Instant.now());
        InventoryMovement savedMovement = movementRepository.save(movement);

        auditService.recordInCurrentTransaction(
                "ADJUST_INVENTORY",
                "INVENTORY_LOT",
                lot.getId(),
                Map.of("lotCode", lot.getLotCode(), "adjustment", request.quantity().toPlainString(), "reason", request.reason())
        );

        return InventoryMovementResponse.fromEntity(savedMovement);
    }

    @Transactional
    public InventoryMovementResponse transfer(
            UUID lotId,
            UUID enterpriseId,
            InventoryTransferRequest request,
            User user
    ) {
        InventoryLot sourceLot = lotRepository.findByIdWithLock(lotId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory lot not found with id: " + lotId));

        if (!sourceLot.getEnterprise().getId().equals(enterpriseId)) {
            throw new BusinessRuleException("Cannot transfer lot belonging to another enterprise");
        }

        InventoryLocation targetLocation = locationRepository.findByIdAndEnterpriseId(request.targetLocationId(), enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Target location not found for enterprise: " + request.targetLocationId()));

        if (sourceLot.getLocation().getId().equals(targetLocation.getId())) {
            throw new BusinessRuleException("Target location must be different from current location");
        }

        if (sourceLot.getBalanceQty().compareTo(request.quantity()) < 0) {
            throw new BusinessRuleException(
                    "INSUFFICIENT_STOCK: Insufficient stock for transfer. Available: " + sourceLot.getBalanceQty() + ", requested: " + request.quantity());
        }

        BigDecimal newSourceBalance = sourceLot.getBalanceQty().subtract(request.quantity());
        sourceLot.setBalanceQty(newSourceBalance);
        if (newSourceBalance.compareTo(BigDecimal.ZERO) == 0) {
            sourceLot.setStatus(LotStatus.DEPLETED);
        }
        lotRepository.save(sourceLot);

        InventoryMovement outMovement = new InventoryMovement();
        outMovement.setLot(sourceLot);
        outMovement.setMovementType(MovementType.TRANSFER_OUT);
        outMovement.setQuantity(request.quantity().negate());
        outMovement.setBalanceAfter(newSourceBalance);
        outMovement.setReason(request.reason() != null ? request.reason() : "Transfer to " + targetLocation.getName());
        outMovement.setReferenceType("INVENTORY_LOCATION");
        outMovement.setReferenceId(targetLocation.getId());
        outMovement.setCreatedByUser(user);
        outMovement.setCreatedAt(Instant.now());
        InventoryMovement savedOutMovement = movementRepository.save(outMovement);

        // Create target lot
        InventoryLot targetLot = new InventoryLot();
        targetLot.setLotCode(sourceLot.getLotCode() + "-T" + codeGenerator.generateReceiptNumber().replace("REC-", ""));
        targetLot.setEnterprise(sourceLot.getEnterprise());
        targetLot.setLocation(targetLocation);
        targetLot.setProductType(sourceLot.getProductType());
        targetLot.setSourceDeliveryItem(sourceLot.getSourceDeliveryItem());
        targetLot.setGrade(sourceLot.getGrade());
        targetLot.setReceivedQty(request.quantity());
        targetLot.setBalanceQty(request.quantity());
        targetLot.setUnit(sourceLot.getUnit());
        targetLot.setStatus(LotStatus.ACTIVE);
        targetLot.setReceivedAt(Instant.now());
        InventoryLot savedTargetLot = lotRepository.save(targetLot);

        InventoryMovement inMovement = new InventoryMovement();
        inMovement.setLot(savedTargetLot);
        inMovement.setMovementType(MovementType.TRANSFER_IN);
        inMovement.setQuantity(request.quantity());
        inMovement.setBalanceAfter(request.quantity());
        inMovement.setReason("Transfer in from lot " + sourceLot.getLotCode());
        inMovement.setReferenceType("INVENTORY_LOT");
        inMovement.setReferenceId(sourceLot.getId());
        inMovement.setCreatedByUser(user);
        inMovement.setCreatedAt(Instant.now());
        movementRepository.save(inMovement);

        auditService.recordInCurrentTransaction(
                "TRANSFER_INVENTORY",
                "INVENTORY_LOT",
                sourceLot.getId(),
                Map.of("sourceLot", sourceLot.getLotCode(), "targetLot", targetLot.getLotCode(), "quantity", request.quantity().toPlainString())
        );

        return InventoryMovementResponse.fromEntity(savedOutMovement);
    }

    @Transactional
    public InventoryMovementResponse dispose(
            UUID lotId,
            UUID enterpriseId,
            InventoryDisposalRequest request,
            User user
    ) {
        InventoryLot lot = lotRepository.findByIdWithLock(lotId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory lot not found with id: " + lotId));

        if (!lot.getEnterprise().getId().equals(enterpriseId)) {
            throw new BusinessRuleException("Cannot dispose lot belonging to another enterprise");
        }

        if (lot.getBalanceQty().compareTo(request.quantity()) < 0) {
            throw new BusinessRuleException(
                    "INSUFFICIENT_STOCK: Insufficient stock for disposal. Available: " + lot.getBalanceQty() + ", requested: " + request.quantity());
        }

        BigDecimal newBalance = lot.getBalanceQty().subtract(request.quantity());
        lot.setBalanceQty(newBalance);
        if (newBalance.compareTo(BigDecimal.ZERO) == 0) {
            lot.setStatus(LotStatus.DISPOSED);
        }
        lotRepository.save(lot);

        InventoryMovement movement = new InventoryMovement();
        movement.setLot(lot);
        movement.setMovementType(MovementType.DISPOSAL);
        movement.setQuantity(request.quantity().negate());
        movement.setBalanceAfter(newBalance);
        movement.setReason(request.reason());
        movement.setCreatedByUser(user);
        movement.setCreatedAt(Instant.now());
        InventoryMovement savedMovement = movementRepository.save(movement);

        auditService.recordInCurrentTransaction(
                "DISPOSE_INVENTORY",
                "INVENTORY_LOT",
                lot.getId(),
                Map.of("lotCode", lot.getLotCode(), "disposedQty", request.quantity().toPlainString(), "reason", request.reason())
        );

        return InventoryMovementResponse.fromEntity(savedMovement);
    }

    @Transactional(readOnly = true)
    public List<InventoryLotResponse> getEnterpriseLots(UUID enterpriseId, LotStatus status) {
        List<InventoryLot> lots = (status != null)
                ? lotRepository.findByEnterpriseIdAndStatus(enterpriseId, status)
                : lotRepository.findByEnterpriseId(enterpriseId);
        return lots.stream().map(InventoryLotResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public InventoryLotResponse getLotById(UUID lotId, UUID enterpriseId) {
        InventoryLot lot = lotRepository.findByIdAndEnterpriseId(lotId, enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Lot not found with id: " + lotId));
        return InventoryLotResponse.fromEntity(lot);
    }

    @Transactional(readOnly = true)
    public List<InventoryMovementResponse> getLotMovements(UUID lotId, UUID enterpriseId) {
        InventoryLot lot = lotRepository.findByIdAndEnterpriseId(lotId, enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Lot not found with id: " + lotId));
        return movementRepository.findByLotIdOrderByCreatedAtAsc(lot.getId()).stream()
                .map(InventoryMovementResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public ReconciliationReportResponse reconcileLotBalance(UUID lotId) {
        InventoryLot lot = lotRepository.findById(lotId)
                .orElseThrow(() -> new ResourceNotFoundException("Lot not found with id: " + lotId));

        BigDecimal movementSum = movementRepository.sumQuantityByLotId(lotId);
        boolean reconciled = lot.getBalanceQty().compareTo(movementSum) == 0;
        String note = reconciled ? "Balance matches movement sum exactly"
                : "Discrepancy detected! Stored: " + lot.getBalanceQty() + ", Movements sum: " + movementSum;

        return new ReconciliationReportResponse(
                lot.getId(),
                lot.getLotCode(),
                lot.getBalanceQty(),
                movementSum,
                reconciled,
                note
        );
    }

    @Transactional(readOnly = true)
    public List<ReconciliationReportResponse> reconcileEnterpriseLots(UUID enterpriseId) {
        List<InventoryLot> lots = lotRepository.findByEnterpriseId(enterpriseId);
        return lots.stream().map(lot -> {
            BigDecimal movementSum = movementRepository.sumQuantityByLotId(lot.getId());
            boolean reconciled = lot.getBalanceQty().compareTo(movementSum) == 0;
            String note = reconciled ? "Matches" : "Discrepancy";
            return new ReconciliationReportResponse(
                    lot.getId(),
                    lot.getLotCode(),
                    lot.getBalanceQty(),
                    movementSum,
                    reconciled,
                    note
            );
        }).toList();
    }
}
