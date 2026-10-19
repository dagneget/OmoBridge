package com.omobridge.delivery.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeliveryJobRepository extends JpaRepository<DeliveryJob, UUID> {

    Optional<DeliveryJob> findByJobNo(String jobNo);

    @EntityGraph(attributePaths = {"provider", "provider.user", "statusHistories"})
    Optional<DeliveryJob> findWithProviderByJobNo(String jobNo);

    Optional<DeliveryJob> findByTrackingToken(String trackingToken);

    @EntityGraph(attributePaths = {"provider", "provider.user", "jobOrders", "jobOrders.order"})
    List<DeliveryJob> findByProviderIdOrderByCreatedAtDesc(UUID providerId);

    @EntityGraph(attributePaths = {"provider", "provider.user", "jobOrders", "jobOrders.order", "statusHistories"})
    Optional<DeliveryJob> findDetailsById(UUID id);

    @EntityGraph(attributePaths = {"provider", "provider.user", "jobOrders", "jobOrders.order", "statusHistories"})
    Optional<DeliveryJob> findDetailsByTrackingToken(String trackingToken);
}
