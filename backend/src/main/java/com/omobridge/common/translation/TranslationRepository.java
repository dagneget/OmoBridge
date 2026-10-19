package com.omobridge.common.translation;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TranslationRepository extends JpaRepository<Translation, UUID> {
    Optional<Translation> findByEntityTypeAndEntityIdAndFieldNameAndLanguage(
            String entityType, UUID entityId, String fieldName, String language);

    List<Translation> findAllByEntityTypeAndEntityId(String entityType, UUID entityId);
}
