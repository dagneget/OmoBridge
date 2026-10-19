package com.omobridge.inventory.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryLocationRepository extends JpaRepository<InventoryLocation, UUID> {
    List<InventoryLocation> findByEnterpriseId(UUID enterpriseId);
    Optional<InventoryLocation> findByIdAndEnterpriseId(UUID id, UUID enterpriseId);
    Optional<InventoryLocation> findFirstByEnterpriseId(UUID enterpriseId);
}
