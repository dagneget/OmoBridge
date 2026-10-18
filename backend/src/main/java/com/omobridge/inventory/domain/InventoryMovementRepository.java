package com.omobridge.inventory.domain;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, UUID> {

    List<InventoryMovement> findByLotIdOrderByCreatedAtAsc(UUID lotId);

    @Query("SELECT COALESCE(SUM(m.quantity), 0) FROM InventoryMovement m WHERE m.lot.id = :lotId")
    BigDecimal sumQuantityByLotId(@Param("lotId") UUID lotId);

    @Query("SELECT m FROM InventoryMovement m WHERE m.lot.enterprise.id = :enterpriseId ORDER BY m.createdAt DESC")
    List<InventoryMovement> findByEnterpriseId(@Param("enterpriseId") UUID enterpriseId);
}
