package com.omobridge.supply.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.outbox.TransactionalOutboxService;
import com.omobridge.common.util.CodeGenerator;
import com.omobridge.common.util.MoneyUtil;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.Farmer;
import com.omobridge.identity.domain.FarmerRepository;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.identity.domain.UserStatus;
import com.omobridge.supply.api.dto.SupplyDeliveryCreateRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryInspectionItemRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryInspectionRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryItemCreateRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryResponse;
import com.omobridge.supply.domain.BuyingPrice;
import com.omobridge.supply.domain.BuyingPriceRepository;
import com.omobridge.supply.domain.DeliveryStatus;
import com.omobridge.supply.domain.FarmerPayable;
import com.omobridge.supply.domain.FarmerPayableRepository;
import com.omobridge.supply.domain.PayableStatus;
import com.omobridge.supply.domain.ProductType;
import com.omobridge.supply.domain.ProductTypeRepository;
import com.omobridge.supply.domain.SupplyDelivery;
import com.omobridge.supply.domain.SupplyDeliveryItem;
import com.omobridge.supply.domain.SupplyDeliveryRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupplyDeliveryService {

    private final SupplyDeliveryRepository deliveryRepository;
    private final ProductTypeRepository productTypeRepository;
    private final BuyingPriceRepository buyingPriceRepository;
    private final FarmerPayableRepository payableRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final FarmerRepository farmerRepository;
    private final UserRepository userRepository;
    private final CodeGenerator codeGenerator;
    private final AuditService auditService;
    private final TransactionalOutboxService outboxService;
    private final com.omobridge.inventory.service.InventoryService inventoryService;

    @Transactional
    public SupplyDeliveryResponse recordDelivery(UUID enterpriseId, UUID receivedByUserId, SupplyDeliveryCreateRequest request) {
        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with id: " + enterpriseId));

        Farmer farmer = farmerRepository.findById(request.farmerId())
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found with id: " + request.farmerId()));

        if (farmer.getEnterprise() == null || !farmer.getEnterprise().getId().equals(enterpriseId)) {
            throw new BusinessRuleException("Farmer does not belong to this enterprise");
        }

        if (farmer.getUser().getStatus() != UserStatus.ACTIVE) {
            throw new BusinessRuleException("Farmer account is not active");
        }

        User receivedByUser = userRepository.findById(receivedByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Receiving staff not found with id: " + receivedByUserId));

        SupplyDelivery delivery = new SupplyDelivery();
        delivery.setDeliveryNo("DEL-" + codeGenerator.generateReceiptNumber().replace("REC-", ""));
        delivery.setEnterprise(enterprise);
        delivery.setFarmer(farmer);
        delivery.setDeliveredAt(request.deliveredAt() != null ? request.deliveredAt() : Instant.now());
        delivery.setReceivedByUser(receivedByUser);
        delivery.setStatus(DeliveryStatus.RECORDED);
        delivery.setNotes(request.notes());

        for (SupplyDeliveryItemCreateRequest itemReq : request.items()) {
            ProductType productType = productTypeRepository.findById(itemReq.productTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product type not found with id: " + itemReq.productTypeId()));

            SupplyDeliveryItem item = new SupplyDeliveryItem();
            item.setProductType(productType);
            item.setGrade(itemReq.grade());
            item.setDeliveredQty(itemReq.deliveredQty());
            item.setAcceptedQty(BigDecimal.ZERO);
            item.setRejectedQty(BigDecimal.ZERO);
            item.setUnitPriceSnapshot(BigDecimal.ZERO);
            item.setLineTotal(BigDecimal.ZERO);

            delivery.addItem(item);
        }

        SupplyDelivery saved = deliveryRepository.save(delivery);

        auditService.recordInCurrentTransaction(
                "RECORD_SUPPLY_DELIVERY",
                "SUPPLY_DELIVERY",
                saved.getId(),
                Map.of("deliveryNo", saved.getDeliveryNo(), "farmerId", farmer.getId().toString())
        );

        outboxService.publishInTransaction(
                "SUPPLY_DELIVERY_RECORDED",
                "SUPPLY_DELIVERY",
                saved.getId(),
                Map.of("deliveryNo", saved.getDeliveryNo(), "farmerId", farmer.getId().toString())
        );

        return SupplyDeliveryResponse.fromEntity(saved);
    }

    @Transactional
    public SupplyDeliveryResponse inspectDelivery(UUID deliveryId, UUID inspectorUserId, SupplyDeliveryInspectionRequest request) {
        SupplyDelivery delivery = deliveryRepository.findWithDetailsById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Supply delivery not found with id: " + deliveryId));

        if (delivery.getStatus() != DeliveryStatus.RECORDED) {
            throw new BusinessRuleException("Only RECORDED deliveries can be inspected. Current status: " + delivery.getStatus());
        }

        Map<UUID, SupplyDeliveryInspectionItemRequest> inspectionMap = request.items().stream()
                .collect(Collectors.toMap(SupplyDeliveryInspectionItemRequest::deliveryItemId, i -> i));

        Instant now = Instant.now();

        for (SupplyDeliveryItem item : delivery.getItems()) {
            SupplyDeliveryInspectionItemRequest inspItem = inspectionMap.get(item.getId());
            if (inspItem == null) {
                throw new BusinessRuleException("Missing inspection data for delivery item id: " + item.getId());
            }

            BigDecimal sumQty = inspItem.acceptedQty().add(inspItem.rejectedQty());
            if (sumQty.compareTo(item.getDeliveredQty()) != 0) {
                throw new BusinessRuleException("Sum of accepted (" + inspItem.acceptedQty() +
                        ") and rejected (" + inspItem.rejectedQty() + ") must equal delivered (" + item.getDeliveredQty() + ")");
            }

            BuyingPrice buyingPrice = buyingPriceRepository.findFirstActivePrice(
                    delivery.getEnterprise().getId(), item.getProductType().getId(), item.getGrade(), now
            ).orElseThrow(() -> new BusinessRuleException("No active buying price configured for product: " +
                    item.getProductType().getName() + " with grade: " + item.getGrade()));

            item.setUnitPriceSnapshot(buyingPrice.getPricePerUnit());
            item.setAcceptedQty(inspItem.acceptedQty());
            item.setRejectedQty(inspItem.rejectedQty());
            item.setRejectionReason(inspItem.rejectionReason());

            BigDecimal lineTotal = MoneyUtil.roundMoney(inspItem.acceptedQty().multiply(item.getUnitPriceSnapshot()));
            item.setLineTotal(lineTotal);

            if (inspItem.acceptedQty().compareTo(BigDecimal.ZERO) > 0) {
                FarmerPayable payable = new FarmerPayable();
                payable.setPayableNo("PAYABLE-" + codeGenerator.generateReceiptNumber().replace("REC-", ""));
                payable.setFarmer(delivery.getFarmer());
                payable.setEnterprise(delivery.getEnterprise());
                payable.setDeliveryItem(item);
                payable.setAmountDue(lineTotal);
                payable.setAmountAllocated(BigDecimal.ZERO);
                payable.setStatus(PayableStatus.OPEN);
                payableRepository.save(payable);

                User inspector = inspectorUserId != null ? userRepository.findById(inspectorUserId).orElse(null) : null;
                inventoryService.receiveFromSupplyDelivery(delivery.getEnterprise(), item, inspItem.acceptedQty(), inspector);
            }
        }

        delivery.setStatus(DeliveryStatus.INSPECTED);
        SupplyDelivery saved = deliveryRepository.save(delivery);

        auditService.recordInCurrentTransaction(
                "INSPECT_SUPPLY_DELIVERY",
                "SUPPLY_DELIVERY",
                saved.getId(),
                Map.of("deliveryNo", saved.getDeliveryNo(), "status", saved.getStatus().name())
        );

        outboxService.publishInTransaction(
                "SUPPLY_DELIVERY_INSPECTED",
                "SUPPLY_DELIVERY",
                saved.getId(),
                Map.of("deliveryNo", saved.getDeliveryNo(), "status", saved.getStatus().name())
        );

        return SupplyDeliveryResponse.fromEntity(saved);
    }

    @Transactional
    public SupplyDeliveryResponse cancelDelivery(UUID deliveryId, UUID actorUserId, String reason) {
        SupplyDelivery delivery = deliveryRepository.findWithDetailsById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Supply delivery not found with id: " + deliveryId));

        if (delivery.getStatus() == DeliveryStatus.CANCELLED) {
            return SupplyDeliveryResponse.fromEntity(delivery);
        }

        if (delivery.getStatus() == DeliveryStatus.INSPECTED) {
            for (SupplyDeliveryItem item : delivery.getItems()) {
                Optional<FarmerPayable> payableOpt = payableRepository.findByDeliveryItemId(item.getId());
                if (payableOpt.isPresent()) {
                    FarmerPayable payable = payableOpt.get();
                    if (payable.getAmountAllocated().compareTo(BigDecimal.ZERO) > 0 || payable.getStatus() == PayableStatus.SETTLED) {
                        throw new BusinessRuleException("Cannot cancel delivery with settled or allocated payments. Issue a correction record instead.");
                    }
                    payable.setStatus(PayableStatus.VOID);
                    payableRepository.save(payable);
                }
            }
        }

        delivery.setStatus(DeliveryStatus.CANCELLED);
        SupplyDelivery saved = deliveryRepository.save(delivery);

        auditService.recordInCurrentTransaction(
                "CANCEL_SUPPLY_DELIVERY",
                "SUPPLY_DELIVERY",
                saved.getId(),
                Map.of("deliveryNo", saved.getDeliveryNo(), "reason", reason != null ? reason : "Cancelled by enterprise")
        );

        return SupplyDeliveryResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public SupplyDeliveryResponse getDeliveryById(UUID deliveryId) {
        SupplyDelivery delivery = deliveryRepository.findWithDetailsById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Supply delivery not found with id: " + deliveryId));
        return SupplyDeliveryResponse.fromEntity(delivery);
    }

    @Transactional(readOnly = true)
    public List<SupplyDeliveryResponse> getEnterpriseDeliveries(UUID enterpriseId) {
        return deliveryRepository.findAllByEnterpriseIdOrderByDeliveredAtDesc(enterpriseId)
                .stream()
                .map(SupplyDeliveryResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SupplyDeliveryResponse> getFarmerDeliveries(UUID farmerId) {
        return deliveryRepository.findAllByFarmerIdOrderByDeliveredAtDesc(farmerId)
                .stream()
                .map(SupplyDeliveryResponse::fromEntity)
                .toList();
    }
}
