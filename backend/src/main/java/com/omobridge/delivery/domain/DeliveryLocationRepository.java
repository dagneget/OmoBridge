package com.omobridge.delivery.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeliveryLocationRepository extends JpaRepository<DeliveryLocation, UUID> {

    List<DeliveryLocation> findByJobIdOrderByRecordedAtAsc(UUID jobId);

    Optional<DeliveryLocation> findTopByJobIdOrderByRecordedAtDesc(UUID jobId);
}
