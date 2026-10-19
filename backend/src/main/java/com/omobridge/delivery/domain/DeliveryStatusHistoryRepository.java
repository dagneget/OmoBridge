package com.omobridge.delivery.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeliveryStatusHistoryRepository extends JpaRepository<DeliveryStatusHistory, UUID> {

    List<DeliveryStatusHistory> findByJobIdOrderByCreatedAtAsc(UUID jobId);
}
