package com.omobridge.payments.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProviderEventRepository extends JpaRepository<ProviderEvent, UUID> {

    Optional<ProviderEvent> findByProviderAndProviderEventId(String provider, String providerEventId);
}
