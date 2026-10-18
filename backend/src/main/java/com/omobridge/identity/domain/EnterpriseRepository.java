package com.omobridge.identity.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EnterpriseRepository extends JpaRepository<Enterprise, UUID> {
    Optional<Enterprise> findByOwnerUserId(UUID ownerUserId);
    List<Enterprise> findAllByStatus(EnterpriseStatus status);
}
