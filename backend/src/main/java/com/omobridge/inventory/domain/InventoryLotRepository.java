package com.omobridge.inventory.domain;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryLotRepository extends JpaRepository<InventoryLot, UUID> {

    Optional<InventoryLot> findByLotCode(String lotCode);

    List<InventoryLot> findByEnterpriseId(UUID enterpriseId);

    List<InventoryLot> findByEnterpriseIdAndStatus(UUID enterpriseId, LotStatus status);

    Optional<InventoryLot> findByIdAndEnterpriseId(UUID id, UUID enterpriseId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM InventoryLot l WHERE l.id = :id")
    Optional<InventoryLot> findByIdWithLock(@Param("id") UUID id);
}
