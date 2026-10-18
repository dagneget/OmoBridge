package com.omobridge.orders.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.util.CodeGenerator;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.User;
import com.omobridge.orders.api.dto.CheckoutItemRequest;
import com.omobridge.orders.api.dto.CheckoutRequest;
import com.omobridge.orders.api.dto.CheckoutResponse;
import com.omobridge.orders.api.dto.OrderSummaryResponse;
import com.omobridge.orders.domain.CheckoutGroup;
import com.omobridge.orders.domain.CheckoutGroupRepository;
import com.omobridge.orders.domain.CheckoutGroupStatus;
import com.omobridge.orders.domain.Order;
import com.omobridge.orders.domain.OrderItem;
import com.omobridge.orders.domain.OrderItemRepository;
import com.omobridge.orders.domain.OrderRepository;
import com.omobridge.orders.domain.OrderStatus;
import com.omobridge.orders.domain.OrderStatusHistory;
import com.omobridge.orders.domain.OrderStatusHistoryRepository;
import com.omobridge.orders.domain.ReservationStatus;
import com.omobridge.orders.domain.StockReservation;
import com.omobridge.orders.domain.StockReservationRepository;
import com.omobridge.products.domain.Product;
import com.omobridge.products.domain.ProductRepository;
import com.omobridge.products.domain.ProductStockMovement;
import com.omobridge.products.domain.ProductStockMovementRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CheckoutService {

    private final CheckoutGroupRepository checkoutGroupRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final StockReservationRepository stockReservationRepository;
    private final ProductRepository productRepository;
    private final ProductStockMovementRepository productStockMovementRepository;
    private final CodeGenerator codeGenerator;
    private final AuditService auditService;

    @Transactional
    public CheckoutResponse checkout(CheckoutRequest request, User buyer) {
        if (request.idempotencyKey() != null && !request.idempotencyKey().isBlank()) {
            var existing = checkoutGroupRepository.findByIdempotencyKey(request.idempotencyKey());
            if (existing.isPresent()) {
                log.info("Idempotent checkout hit for key {}", request.idempotencyKey());
                return mapToResponse(existing.get());
            }
        }

        if (request.items() == null || request.items().isEmpty()) {
            throw new BusinessRuleException("Checkout items cannot be empty");
        }

        // Aggregate quantities per product
        Map<UUID, BigDecimal> requestedQuantities = new HashMap<>();
        for (CheckoutItemRequest item : request.items()) {
            if (item.quantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessRuleException("Item quantity must be greater than zero");
            }
            requestedQuantities.merge(item.productId(), item.quantity(), BigDecimal::add);
        }

        // Lock products in deterministic order (UUID natural ordering) to prevent database deadlocks
        List<UUID> sortedProductIds = requestedQuantities.keySet().stream().sorted().toList();
        Map<UUID, Product> lockedProducts = new HashMap<>();
        for (UUID productId : sortedProductIds) {
            Product product = productRepository.findByIdWithLock(productId)
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));
            if (!product.isPublished()) {
                throw new BusinessRuleException("Product '" + product.getName() + "' is not available for purchase");
            }

            BigDecimal requestedQty = requestedQuantities.get(productId);
            BigDecimal available = product.getStockOnHand().subtract(product.getStockReserved());
            if (available.compareTo(requestedQty) < 0) {
                throw new BusinessRuleException("Insufficient stock for product '" + product.getName()
                        + "': available " + available + ", requested " + requestedQty);
            }
            lockedProducts.put(productId, product);
        }

        // Group items by enterprise
        Map<Enterprise, List<CheckoutItemRequest>> itemsByEnterprise = request.items().stream()
                .collect(Collectors.groupingBy(item -> lockedProducts.get(item.productId()).getEnterprise()));

        // Create CheckoutGroup
        CheckoutGroup group = new CheckoutGroup();
        group.setGroupNo(codeGenerator.generateCheckoutGroupNumber());
        group.setBuyer(buyer);
        group.setStatus(CheckoutGroupStatus.CREATED);
        group.setTotalAmount(BigDecimal.ZERO);
        group.setCurrency("ETB");
        group.setIdempotencyKey(request.idempotencyKey());
        CheckoutGroup savedGroup = checkoutGroupRepository.save(group);

        BigDecimal groupTotal = BigDecimal.ZERO;
        List<Order> createdOrders = new ArrayList<>();

        for (Map.Entry<Enterprise, List<CheckoutItemRequest>> entry : itemsByEnterprise.entrySet()) {
            Enterprise enterprise = entry.getKey();
            List<CheckoutItemRequest> enterpriseItems = entry.getValue();

            Order order = new Order();
            order.setOrderNo(codeGenerator.generateOrderNumber());
            order.setCheckoutGroup(savedGroup);
            order.setEnterprise(enterprise);
            order.setBuyer(buyer);
            order.setStatus(OrderStatus.PLACED);
            order.setCurrency("ETB");
            order.setDeliveryAddress(request.deliveryAddress());
            order.setDeliveryPhone(request.deliveryPhone());
            order.setDeliveryLatitude(request.deliveryLatitude());
            order.setDeliveryLongitude(request.deliveryLongitude());
            order.setNotes(request.notes());
            order.setIdempotencyKey(request.idempotencyKey() != null ? request.idempotencyKey() + "-" + enterprise.getId() : null);

            BigDecimal subtotal = BigDecimal.ZERO;
            BigDecimal tax = BigDecimal.ZERO;
            BigDecimal platformFee = BigDecimal.ZERO;
            BigDecimal deliveryFee = BigDecimal.ZERO; // MVP default flat or calculated

            order.setSubtotal(subtotal);
            order.setTax(tax);
            order.setPlatformFee(platformFee);
            order.setDeliveryFee(deliveryFee);
            order.setTotalAmount(BigDecimal.ZERO);

            Order savedOrder = orderRepository.save(order);

            for (CheckoutItemRequest itemReq : enterpriseItems) {
                Product product = lockedProducts.get(itemReq.productId());
                BigDecimal qty = itemReq.quantity();
                BigDecimal lineTotal = product.getUnitPrice().multiply(qty).setScale(2, RoundingMode.HALF_UP);
                subtotal = subtotal.add(lineTotal);

                if (product.getPriceBreakdown() != null) {
                    tax = tax.add(product.getPriceBreakdown().getTaxAmount().multiply(qty).setScale(2, RoundingMode.HALF_UP));
                    platformFee = platformFee.add(product.getPriceBreakdown().getPlatformFee().multiply(qty).setScale(2, RoundingMode.HALF_UP));
                }

                // Create OrderItem snapshot
                OrderItem orderItem = new OrderItem();
                orderItem.setOrder(savedOrder);
                orderItem.setProduct(product);
                orderItem.setBatch(product.getProductionOutput() != null ? product.getProductionOutput().getBatch() : null);
                orderItem.setProductNameSnapshot(product.getName());
                orderItem.setProductSkuSnapshot(product.getSku());
                orderItem.setUnitPriceSnapshot(product.getUnitPrice());
                orderItem.setCurrency(product.getCurrency());
                orderItem.setQuantity(qty);
                orderItem.setLineTotal(lineTotal);
                orderItemRepository.save(orderItem);
                savedOrder.getItems().add(orderItem);

                // Create StockReservation
                StockReservation reservation = new StockReservation();
                reservation.setProduct(product);
                reservation.setOrder(savedOrder);
                reservation.setQuantity(qty);
                reservation.setStatus(ReservationStatus.HELD);
                reservation.setExpiresAt(Instant.now().plus(Duration.ofMinutes(30)));
                stockReservationRepository.save(reservation);
                savedOrder.getReservations().add(reservation);

                // Reserve product stock
                product.setStockReserved(product.getStockReserved().add(qty));
                productRepository.save(product);

                // Append-only stock movement
                ProductStockMovement movement = new ProductStockMovement();
                movement.setProduct(product);
                movement.setMovementType(com.omobridge.products.domain.ProductStockMovementType.RESERVATION_HOLD);
                movement.setQuantity(qty);
                movement.setStockAfter(product.getStockOnHand());
                movement.setReason("Held for order " + savedOrder.getOrderNo());
                movement.setReferenceType("ORDER");
                movement.setReferenceId(savedOrder.getId());
                movement.setCreatedByUser(buyer);
                productStockMovementRepository.save(movement);
            }

            BigDecimal totalAmount = subtotal.add(tax).add(platformFee).add(deliveryFee);
            savedOrder.setSubtotal(subtotal);
            savedOrder.setTax(tax);
            savedOrder.setPlatformFee(platformFee);
            savedOrder.setDeliveryFee(deliveryFee);
            savedOrder.setTotalAmount(totalAmount);
            orderRepository.save(savedOrder);

            // Record initial status history
            OrderStatusHistory history = new OrderStatusHistory();
            history.setOrder(savedOrder);
            history.setFromStatus(null);
            history.setToStatus(OrderStatus.PLACED);
            history.setChangedByUser(buyer);
            history.setReason("Order created via checkout");
            orderStatusHistoryRepository.save(history);
            savedOrder.getStatusHistories().add(history);

            groupTotal = groupTotal.add(totalAmount);
            createdOrders.add(savedOrder);
        }

        savedGroup.setTotalAmount(groupTotal);
        savedGroup.getOrders().addAll(createdOrders);
        checkoutGroupRepository.save(savedGroup);

        auditService.record("CHECKOUT", "CHECKOUT_GROUP", savedGroup.getId(),
                "Checkout group " + savedGroup.getGroupNo() + " created with " + createdOrders.size() + " enterprise orders");

        return mapToResponse(savedGroup);
    }

    private CheckoutResponse mapToResponse(CheckoutGroup group) {
        List<Order> orders = orderRepository.findByCheckoutGroupId(group.getId());
        List<OrderSummaryResponse> orderResponses = orders.stream()
                .map(o -> new OrderSummaryResponse(
                        o.getId(),
                        o.getOrderNo(),
                        o.getEnterprise().getId(),
                        o.getEnterprise().getName(),
                        o.getStatus(),
                        o.getSubtotal(),
                        o.getTax(),
                        o.getPlatformFee(),
                        o.getDeliveryFee(),
                        o.getTotalAmount(),
                        o.getCurrency(),
                        o.getItems() != null ? o.getItems().size() : 0,
                        o.getCreatedAt()
                ))
                .toList();

        return new CheckoutResponse(
                group.getId(),
                group.getGroupNo(),
                group.getStatus(),
                group.getTotalAmount(),
                group.getCurrency(),
                orderResponses
        );
    }
}
