package com.omobridge.tourism.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransportServiceRepository extends JpaRepository<TransportService, UUID> {
    List<TransportService> findAllByIsActiveTrue();
    List<TransportService> findAllByEnterpriseId(UUID enterpriseId);
}
