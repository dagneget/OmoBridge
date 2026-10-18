package com.omobridge.supply.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BuyingPriceRepository extends JpaRepository<BuyingPrice, UUID> {

    List<BuyingPrice> findAllByEnterpriseIdAndIsActiveTrue(UUID enterpriseId);

    @Query("""
        SELECT bp FROM BuyingPrice bp
        WHERE bp.enterprise.id = :enterpriseId
          AND bp.productType.id = :productTypeId
          AND bp.grade = :grade
          AND bp.isActive = true
          AND bp.effectiveFrom <= :now
          AND (bp.effectiveTo IS NULL OR bp.effectiveTo >= :now)
        ORDER BY bp.effectiveFrom DESC
    """)
    List<BuyingPrice> findActiveBuyingPrices(
            @Param("enterpriseId") UUID enterpriseId,
            @Param("productTypeId") UUID productTypeId,
            @Param("grade") String grade,
            @Param("now") Instant now
    );

    default Optional<BuyingPrice> findFirstActivePrice(UUID enterpriseId, UUID productTypeId, String grade, Instant now) {
        List<BuyingPrice> list = findActiveBuyingPrices(enterpriseId, productTypeId, grade, now);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}
