package com.omobridge.delivery.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeliveryJobOrderRepository extends JpaRepository<DeliveryJobOrder, UUID> {

    List<DeliveryJobOrder> findByJobId(UUID jobId);

    Optional<DeliveryJobOrder> findByOrderId(UUID orderId);
}
