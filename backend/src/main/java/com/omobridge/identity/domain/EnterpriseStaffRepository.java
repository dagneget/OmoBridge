package com.omobridge.identity.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EnterpriseStaffRepository extends JpaRepository<EnterpriseStaff, UUID> {
    List<EnterpriseStaff> findAllByEnterpriseId(UUID enterpriseId);
    Optional<EnterpriseStaff> findByEnterpriseIdAndUserId(UUID enterpriseId, UUID userId);
    Optional<EnterpriseStaff> findByUserId(UUID userId);
    boolean existsByEnterpriseIdAndUserIdAndIsActiveTrue(UUID enterpriseId, UUID userId);
}
