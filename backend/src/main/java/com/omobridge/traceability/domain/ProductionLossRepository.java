package com.omobridge.traceability.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductionLossRepository extends JpaRepository<ProductionLoss, UUID> {
    List<ProductionLoss> findByBatchId(UUID batchId);
}
