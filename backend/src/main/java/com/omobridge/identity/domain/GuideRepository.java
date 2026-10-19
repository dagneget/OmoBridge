package com.omobridge.identity.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GuideRepository extends JpaRepository<Guide, UUID> {
    Optional<Guide> findByUserId(UUID userId);
    List<Guide> findAllByIsAvailableTrueAndVerificationStatus(VerificationStatus status);
}
