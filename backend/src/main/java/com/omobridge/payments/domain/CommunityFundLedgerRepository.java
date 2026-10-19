package com.omobridge.payments.domain;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CommunityFundLedgerRepository extends JpaRepository<CommunityFundLedger, UUID> {

    List<CommunityFundLedger> findByEnterpriseIdOrderByCreatedAtDesc(UUID enterpriseId);

    List<CommunityFundLedger> findBySourceTypeAndSourceId(String sourceType, UUID sourceId);

    @Query("SELECT COALESCE(SUM(CASE WHEN c.entryType = 'CREDIT' THEN c.amount ELSE -c.amount END), 0) " +
            "FROM CommunityFundLedger c WHERE c.enterprise.id = :enterpriseId")
    BigDecimal getNetCommunityFundByEnterpriseId(@Param("enterpriseId") UUID enterpriseId);
}
