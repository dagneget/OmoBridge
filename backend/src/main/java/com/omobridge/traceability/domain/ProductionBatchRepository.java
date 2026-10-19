package com.omobridge.traceability.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductionBatchRepository extends JpaRepository<ProductionBatch, UUID> {

    Optional<ProductionBatch> findByBatchCode(String batchCode);

    List<ProductionBatch> findByEnterpriseId(UUID enterpriseId);

    Optional<ProductionBatch> findByIdAndEnterpriseId(UUID id, UUID enterpriseId);

    @EntityGraph(attributePaths = {"inputs", "outputs", "losses", "enterprise"})
    Optional<ProductionBatch> findWithDetailsById(UUID id);

    boolean existsByInputsLotId(UUID lotId);
}
