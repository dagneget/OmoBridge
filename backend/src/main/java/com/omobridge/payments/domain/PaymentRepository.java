package com.omobridge.payments.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByPaymentNo(String paymentNo);

    @EntityGraph(attributePaths = {"order", "booking", "payer"})
    Optional<Payment> findByOrderId(UUID orderId);

    @EntityGraph(attributePaths = {"order", "booking", "payer"})
    Optional<Payment> findByBookingId(UUID bookingId);

    List<Payment> findByPayerIdOrderByCreatedAtDesc(UUID payerId);

    @EntityGraph(attributePaths = {"order", "booking"})
    Page<Payment> findByPayerId(UUID payerId, Pageable pageable);

    @EntityGraph(attributePaths = {"order", "booking"})
    Optional<Payment> findByIdAndPayerId(UUID id, UUID payerId);

    @EntityGraph(attributePaths = {"order", "booking"})
    @Query("select p from Payment p where p.order.id = :orderId and p.payer.id = :payerId "
            + "and p.order.buyer.id = :payerId")
    Optional<Payment> findByOrderIdAndPayerId(@Param("orderId") UUID orderId, @Param("payerId") UUID payerId);

    @EntityGraph(attributePaths = {"order", "booking", "payer", "attempts", "refunds"})
    Optional<Payment> findDetailsById(UUID id);
}
