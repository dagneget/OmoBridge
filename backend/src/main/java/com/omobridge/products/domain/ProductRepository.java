package com.omobridge.products.domain;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {

    Optional<Product> findByEnterpriseIdAndSku(UUID enterpriseId, String sku);

    List<Product> findByEnterpriseId(UUID enterpriseId);

    Optional<Product> findByIdAndEnterpriseId(UUID id, UUID enterpriseId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdWithLock(@Param("id") UUID id);

    @EntityGraph(attributePaths = {"priceBreakdown", "enterprise"})
    List<Product> findByPublishedTrue();

    @EntityGraph(attributePaths = {"priceBreakdown", "enterprise"})
    List<Product> findByPublishedTrueAndCategoryIgnoreCase(String category);

    @EntityGraph(attributePaths = {"priceBreakdown", "enterprise"})
    @Query("SELECT p FROM Product p WHERE p.published = true AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Product> searchPublished(@Param("query") String query);

    @EntityGraph(attributePaths = {
            "priceBreakdown",
            "enterprise",
            "productionOutput",
            "productionOutput.batch",
            "productionOutput.batch.traceRecord"
    })
    @Query("SELECT p FROM Product p WHERE p.id = :id AND p.published = true")
    Optional<Product> findPublishedDetailsById(@Param("id") UUID id);
}
