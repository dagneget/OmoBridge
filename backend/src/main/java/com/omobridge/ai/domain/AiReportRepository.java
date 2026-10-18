package com.omobridge.ai.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiReportRepository extends JpaRepository<AiReport, UUID> {
    List<AiReport> findByEnterpriseIdOrderByCreatedAtDesc(UUID enterpriseId);
    Optional<AiReport> findByEnterpriseIdAndReportTypeAndPeriod(UUID enterpriseId, String reportType, String period);
}
