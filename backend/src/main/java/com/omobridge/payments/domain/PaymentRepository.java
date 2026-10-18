package com.omobridge.payments.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByPaymentNo(String paymentNo);

    @EntityGraph(attributePaths = {"order", "booking", "payer"})
    Optional<Payment> findByOrderId(UUID orderId);

    @EntityGraph(attributePaths = {"order", "booking", "payer"})
    Optional<Payment> findByBookingId(UUID bookingId);

    List<Payment> findByPayerIdOrderByCreatedAtDesc(UUID payerId);

    @EntityGraph(attributePaths = {"order", "booking", "payer", "attempts", "refunds"})
    Optional<Payment> findDetailsById(UUID id);
}
