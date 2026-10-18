package com.omobridge.orders.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

    Optional<Order> findByOrderNo(String orderNo);

    @EntityGraph(attributePaths = {"items", "enterprise", "buyer"})
    List<Order> findByCheckoutGroupId(UUID checkoutGroupId);

    @EntityGraph(attributePaths = {"items", "buyer"})
    List<Order> findByEnterpriseIdOrderByCreatedAtDesc(UUID enterpriseId);

    @EntityGraph(attributePaths = {"items", "enterprise"})
    List<Order> findByBuyerIdOrderByCreatedAtDesc(UUID buyerId);

    @EntityGraph(attributePaths = {"items", "buyer", "statusHistories", "reservations"})
    Optional<Order> findDetailsByIdAndEnterpriseId(UUID id, UUID enterpriseId);

    @EntityGraph(attributePaths = {"items", "enterprise", "statusHistories", "reservations"})
    Optional<Order> findDetailsByIdAndBuyerId(UUID id, UUID buyerId);

    @EntityGraph(attributePaths = {"items", "enterprise", "buyer", "statusHistories", "reservations"})
    Optional<Order> findDetailsById(UUID id);
}
