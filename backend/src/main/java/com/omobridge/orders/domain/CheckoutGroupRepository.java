package com.omobridge.orders.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CheckoutGroupRepository extends JpaRepository<CheckoutGroup, UUID> {

    Optional<CheckoutGroup> findByGroupNo(String groupNo);

    Optional<CheckoutGroup> findByIdempotencyKey(String idempotencyKey);

    @EntityGraph(attributePaths = {"orders"})
    List<CheckoutGroup> findByBuyerIdOrderByCreatedAtDesc(UUID buyerId);

    @EntityGraph(attributePaths = {"orders", "orders.items"})
    Optional<CheckoutGroup> findWithOrdersById(UUID id);
}
