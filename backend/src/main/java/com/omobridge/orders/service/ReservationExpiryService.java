package com.omobridge.orders.service;

import com.omobridge.common.audit.AuditService;
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
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationExpiryService {

    private final StockReservationRepository stockReservationRepository;
    private final ProductRepository productRepository;
    private final ProductStockMovementRepository productStockMovementRepository;
    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final AuditService auditService;

    @Scheduled(fixedDelay = 60000) // run every 1 minute
    @Transactional
    public int releaseExpiredReservations() {
        Instant now = Instant.now();
        List<StockReservation> expiredReservations = stockReservationRepository
                .findByStatusAndExpiresAtBefore(ReservationStatus.HELD, now);

        if (expiredReservations.isEmpty()) {
            return 0;
        }

        log.info("Found {} expired reservations to release", expiredReservations.size());
        Set<Order> affectedOrders = new HashSet<>();

        for (StockReservation res : expiredReservations) {
            res.setStatus(ReservationStatus.EXPIRED);
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
            movement.setReason("Expired reservation auto-release for order " + res.getOrder().getOrderNo());
            movement.setReferenceType("ORDER");
            movement.setReferenceId(res.getOrder().getId());
            productStockMovementRepository.save(movement);

            affectedOrders.add(res.getOrder());
        }

        for (Order order : affectedOrders) {
            if (order.getStatus() == OrderStatus.PLACED) {
                // If all reservations for this order are EXPIRED or RELEASED, cancel order
                List<StockReservation> orderReservations = stockReservationRepository.findByOrderId(order.getId());
                boolean hasActiveReservations = orderReservations.stream()
                        .anyMatch(r -> r.getStatus() == ReservationStatus.HELD || r.getStatus() == ReservationStatus.COMMITTED);

                if (!hasActiveReservations) {
                    order.setStatus(OrderStatus.CANCELLED);
                    orderRepository.save(order);

                    OrderStatusHistory history = new OrderStatusHistory();
                    history.setOrder(order);
                    history.setFromStatus(OrderStatus.PLACED);
                    history.setToStatus(OrderStatus.CANCELLED);
                    history.setReason("Order cancelled due to expired stock reservations");
                    orderStatusHistoryRepository.save(history);

                    auditService.record("ORDER_CANCELLED", "ORDER", order.getId(),
                            "Order " + order.getOrderNo() + " automatically cancelled due to reservation expiry");
                }
            }
        }

        return expiredReservations.size();
    }
}
