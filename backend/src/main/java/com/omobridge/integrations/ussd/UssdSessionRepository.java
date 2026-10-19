package com.omobridge.integrations.ussd;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UssdSessionRepository extends JpaRepository<UssdSession, UUID> {
    Optional<UssdSession> findBySessionId(String sessionId);
}
