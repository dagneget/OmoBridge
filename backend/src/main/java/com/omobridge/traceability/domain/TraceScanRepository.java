package com.omobridge.traceability.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TraceScanRepository extends JpaRepository<TraceScan, UUID> {
    List<TraceScan> findByTraceRecordIdOrderByScannedAtDesc(UUID traceRecordId);
    long countByTraceRecordId(UUID traceRecordId);
}
