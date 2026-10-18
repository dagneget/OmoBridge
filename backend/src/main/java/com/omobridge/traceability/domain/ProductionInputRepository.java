package com.omobridge.traceability.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductionInputRepository extends JpaRepository<ProductionInput, UUID> {
    boolean existsByLotId(UUID lotId);
    List<ProductionInput> findByBatchId(UUID batchId);
}
