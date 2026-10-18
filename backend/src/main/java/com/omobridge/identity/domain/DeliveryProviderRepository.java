package com.omobridge.identity.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeliveryProviderRepository extends JpaRepository<DeliveryProvider, UUID> {
    Optional<DeliveryProvider> findByUserId(UUID userId);
    List<DeliveryProvider> findAllByIsAvailableTrueAndVerificationStatus(VerificationStatus status);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user"})
    Optional<DeliveryProvider> findWithUserById(UUID id);
}
