package com.omobridge.pricing.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PriceRuleRepository extends JpaRepository<PriceRule, UUID> {

    List<PriceRule> findAllByEnterpriseId(UUID enterpriseId);

    Optional<PriceRule> findByCode(String code);

    @Query("""
        SELECT r FROM PriceRule r
        WHERE r.isActive = true
          AND (r.enterprise.id = :enterpriseId OR r.enterprise IS NULL)
          AND (r.appliesTo = :appliesTo OR r.appliesTo = 'ALL')
          AND r.effectiveFrom <= :now
          AND (r.effectiveTo IS NULL OR r.effectiveTo >= :now)
        ORDER BY r.code ASC
    """)
    List<PriceRule> findActiveRules(
            @Param("enterpriseId") UUID enterpriseId,
            @Param("appliesTo") String appliesTo,
            @Param("now") Instant now
    );
}
