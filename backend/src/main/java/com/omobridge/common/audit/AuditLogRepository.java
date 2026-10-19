package com.omobridge.common.audit;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findAllByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, UUID entityId);
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
