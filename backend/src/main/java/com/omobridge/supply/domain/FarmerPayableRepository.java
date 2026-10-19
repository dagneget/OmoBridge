package com.omobridge.supply.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FarmerPayableRepository extends JpaRepository<FarmerPayable, UUID> {

    @EntityGraph(attributePaths = {"farmer", "enterprise", "deliveryItem"})
    Optional<FarmerPayable> findWithDetailsById(UUID id);

    Optional<FarmerPayable> findByDeliveryItemId(UUID deliveryItemId);

    List<FarmerPayable> findAllByFarmerIdOrderByCreatedAtDesc(UUID farmerId);

    List<FarmerPayable> findAllByEnterpriseIdOrderByCreatedAtDesc(UUID enterpriseId);

    @Query("""
        SELECT p FROM FarmerPayable p
        WHERE p.farmer.id = :farmerId
          AND p.status IN ('OPEN', 'PARTIAL')
        ORDER BY p.createdAt ASC
    """)
    List<FarmerPayable> findOpenAndPartialPayablesOldestFirst(@Param("farmerId") UUID farmerId);
}
