package com.omobridge.traceability.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TraceRecordRepository extends JpaRepository<TraceRecord, UUID> {

    Optional<TraceRecord> findByPublicToken(String publicToken);

    Optional<TraceRecord> findByBatchId(UUID batchId);

    @EntityGraph(attributePaths = {
            "batch",
            "batch.enterprise",
            "batch.inputs",
            "batch.inputs.lot",
            "batch.inputs.lot.productType",
            "batch.inputs.lot.sourceDeliveryItem",
            "batch.inputs.lot.sourceDeliveryItem.delivery",
            "batch.inputs.lot.sourceDeliveryItem.delivery.farmer",
            "batch.inputs.lot.sourceDeliveryItem.delivery.farmer.user",
            "batch.outputs",
            "batch.outputs.productType"
    })
    Optional<TraceRecord> findWithFullTraceByPublicToken(String publicToken);
}
