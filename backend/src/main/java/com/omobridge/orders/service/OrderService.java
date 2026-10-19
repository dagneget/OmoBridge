package com.omobridge.orders.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.identity.domain.User;
import com.omobridge.orders.api.dto.OrderDetailResponse;
import com.omobridge.orders.api.dto.OrderItemResponse;
import com.omobridge.orders.api.dto.OrderStatusHistoryResponse;
import com.omobridge.orders.api.dto.OrderSummaryResponse;
import com.omobridge.orders.domain.CheckoutGroup;
import com.omobridge.orders.domain.CheckoutGroupRepository;
import com.omobridge.orders.domain.CheckoutGroupStatus;
import com.omobridge.orders.domain.Order;
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
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final StockReservationRepository stockReservationRepository;
    private final CheckoutGroupRepository checkoutGroupRepository;
    private final ProductRepository productRepository;
    private final ProductStockMovementRepository productStockMovementRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<OrderSummaryResponse> getOrdersForBuyer(UUID buyerUserId) {
        return orderRepository.findByBuyerIdOrderByCreatedAtDesc(buyerUserId).stream()
                .map(this::mapToSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrderSummaryResponse> getOrdersForEnterprise(UUID enterpriseId) {
        return orderRepository.findByEnterpriseIdOrderByCreatedAtDesc(enterpriseId).stream()
                .map(this::mapToSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderDetailResponse getOrderDetailForBuyer(UUID orderId, UUID buyerUserId) {
        Order order = orderRepository.findDetailsByIdAndBuyerId(orderId, buyerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found or access denied"));
        return mapToDetail(order);
    }

    @Transactional(readOnly = true)
    public OrderDetailResponse getOrderDetailForEnterprise(UUID orderId, UUID enterpriseId) {
        Order order = orderRepository.findDetailsByIdAndEnterpriseId(orderId, enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found or access denied"));
        return mapToDetail(order);
    }

    @Transactional(readOnly = true)
    public OrderDetailResponse getOrderDetailById(UUID orderId) {
        Order order = orderRepository.findDetailsById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        return mapToDetail(order);
    }

    @Transactional
    public OrderDetailResponse updateOrderStatus(UUID orderId, OrderStatus newStatus, String reason, User changedByUser) {
        Order order = orderRepository.findDetailsById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        OrderStatus currentStatus = order.getStatus();
        if (!currentStatus.canTransitionTo(newStatus)) {
            throw new BusinessRuleException("Cannot transition order " + order.getOrderNo()
                    + " from " + currentStatus + " to " + newStatus);
        }

        // Apply reservation and stock effects
        List<StockReservation> reservations = stockReservationRepository.findByOrderId(order.getId());
        if (newStatus == OrderStatus.PAID) {
            for (StockReservation res : reservations) {
                if (res.getStatus() == ReservationStatus.HELD) {
                    res.setStatus(ReservationStatus.COMMITTED);
                    stockReservationRepository.save(res);

                    Product product = productRepository.findByIdWithLock(res.getProduct().getId())
                            .orElseThrow();
                    product.setStockReserved(product.getStockReserved().subtract(res.getQuantity()));
                    product.setStockOnHand(product.getStockOnHand().subtract(res.getQuantity()));
                    productRepository.save(product);

                    ProductStockMovement movement = new ProductStockMovement();
                    movement.setProduct(product);
                    movement.setMovementType(com.omobridge.products.domain.ProductStockMovementType.SALE);
                    movement.setQuantity(res.getQuantity());
                    movement.setStockAfter(product.getStockOnHand());
                    movement.setReason("Sale completed for order " + order.getOrderNo());
                    movement.setReferenceType("ORDER");
                    movement.setReferenceId(order.getId());
                    movement.setCreatedByUser(changedByUser);
                    productStockMovementRepository.save(movement);
                }
            }
        } else if (newStatus == OrderStatus.CANCELLED) {
            for (StockReservation res : reservations) {
                if (res.getStatus() == ReservationStatus.HELD) {
                    res.setStatus(ReservationStatus.RELEASED);
                    stockReservationRepository.save(res);

                    Product product = productRepository.findByIdWithLock(res.getProduct().getId())
                            .orElseThrow();
                    product.setStockReserved(product.getStockReserved().subtract(res.getQuantity()));
                    productRepository.save(product);

                    ProductStockMovement movement = new ProductStockMovement();
                    movement.setProduct(product);
                    movement.setMovementType(com.omobridge.products.domain.ProductStockMovementType.RESERVATION_RELEASE);
                    movement.setQuantity(res.getQuantity());
                    movement.setStockAfter(product.getStockOnHand());
                    movement.setReason("Reservation released on cancellation of order " + order.getOrderNo());
                    movement.setReferenceType("ORDER");
                    movement.setReferenceId(order.getId());
                    movement.setCreatedByUser(changedByUser);
                    productStockMovementRepository.save(movement);
                }
            }
        }

        order.setStatus(newStatus);
        orderRepository.save(order);

        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrder(order);
        history.setFromStatus(currentStatus);
        history.setToStatus(newStatus);
        history.setChangedByUser(changedByUser);
        history.setReason(reason);
        orderStatusHistoryRepository.save(history);
        order.getStatusHistories().add(history);

        // Update CheckoutGroup status if all orders are finished
        updateCheckoutGroupStatus(order.getCheckoutGroup());

        auditService.record("ORDER_STATUS_CHANGED", "ORDER", order.getId(),
                "Order " + order.getOrderNo() + " transitioned from " + currentStatus + " to " + newStatus);

        return mapToDetail(order);
    }

    private void updateCheckoutGroupStatus(CheckoutGroup group) {
        List<Order> orders = orderRepository.findByCheckoutGroupId(group.getId());
        boolean allPaid = orders.stream().allMatch(o -> o.getStatus() == OrderStatus.PAID
                || o.getStatus() == OrderStatus.PACKED
                || o.getStatus() == OrderStatus.IN_TRANSIT
                || o.getStatus() == OrderStatus.DELIVERED);
        boolean anyPaid = orders.stream().anyMatch(o -> o.getStatus() == OrderStatus.PAID
                || o.getStatus() == OrderStatus.PACKED
                || o.getStatus() == OrderStatus.IN_TRANSIT
                || o.getStatus() == OrderStatus.DELIVERED);
        boolean allCancelled = orders.stream().allMatch(o -> o.getStatus() == OrderStatus.CANCELLED);

        if (allCancelled) {
            group.setStatus(CheckoutGroupStatus.CANCELLED);
        } else if (allPaid) {
            group.setStatus(CheckoutGroupStatus.PAID);
        } else if (anyPaid) {
            group.setStatus(CheckoutGroupStatus.PARTIALLY_PAID);
        }
        checkoutGroupRepository.save(group);
    }

    private OrderSummaryResponse mapToSummary(Order o) {
        return new OrderSummaryResponse(
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
        );
    }

    private OrderDetailResponse mapToDetail(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(item -> new OrderItemResponse(
                        item.getId(),
                        item.getProduct().getId(),
                        item.getProductNameSnapshot(),
                        item.getProductSkuSnapshot(),
                        item.getUnitPriceSnapshot(),
                        item.getQuantity(),
                        item.getLineTotal(),
                        item.getBatch() != null ? item.getBatch().getId() : null
                ))
                .toList();

        List<OrderStatusHistoryResponse> historyResponses = order.getStatusHistories().stream()
                .map(h -> new OrderStatusHistoryResponse(
                        h.getId(),
                        h.getFromStatus(),
                        h.getToStatus(),
                        h.getChangedByUser() != null ? h.getChangedByUser().getFullName() : "SYSTEM",
                        h.getReason(),
                        h.getCreatedAt()
                ))
                .toList();

        return new OrderDetailResponse(
                order.getId(),
                order.getOrderNo(),
                order.getCheckoutGroup().getId(),
                order.getCheckoutGroup().getGroupNo(),
                order.getEnterprise().getId(),
                order.getEnterprise().getName(),
                order.getBuyer().getId(),
                order.getBuyer().getFullName(),
                order.getBuyer().getPhoneNumber(),
                order.getStatus(),
                order.getSubtotal(),
                order.getTax(),
                order.getPlatformFee(),
                order.getDeliveryFee(),
                order.getTotalAmount(),
                order.getCurrency(),
                order.getDeliveryAddress(),
                order.getDeliveryPhone(),
                order.getDeliveryLatitude(),
                order.getDeliveryLongitude(),
                order.getNotes(),
                itemResponses,
                historyResponses,
                order.getCreatedAt()
        );
    }
}
