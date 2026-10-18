package com.omobridge.products.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductStockMovementRepository extends JpaRepository<ProductStockMovement, UUID> {
    List<ProductStockMovement> findByProductIdOrderByCreatedAtAsc(UUID productId);
}
