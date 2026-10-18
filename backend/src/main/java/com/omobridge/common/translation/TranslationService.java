package com.omobridge.common.translation;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TranslationService {

    private static final String DEFAULT_LANGUAGE = "en";

    private final TranslationRepository translationRepository;

    @Transactional(readOnly = true)
    public String getTranslatedField(String entityType, UUID entityId, String fieldName, String requestedLanguage, String defaultValue) {
        if (requestedLanguage != null && !requestedLanguage.isBlank() && !requestedLanguage.equalsIgnoreCase(DEFAULT_LANGUAGE)) {
            Optional<Translation> specific = translationRepository
                    .findByEntityTypeAndEntityIdAndFieldNameAndLanguage(entityType, entityId, fieldName, requestedLanguage.toLowerCase());
            if (specific.isPresent() && !specific.get().getTranslationText().isBlank()) {
                return specific.get().getTranslationText();
            }
        }

        // Check default language in translations table
        Optional<Translation> fallback = translationRepository
                .findByEntityTypeAndEntityIdAndFieldNameAndLanguage(entityType, entityId, fieldName, DEFAULT_LANGUAGE);
        if (fallback.isPresent() && !fallback.get().getTranslationText().isBlank()) {
            return fallback.get().getTranslationText();
        }

        return defaultValue;
    }

    @Transactional
    public Translation setTranslation(String entityType, UUID entityId, String fieldName, String language, String text) {
        String lang = (language != null && !language.isBlank()) ? language.toLowerCase().trim() : DEFAULT_LANGUAGE;

        Translation translation = translationRepository
                .findByEntityTypeAndEntityIdAndFieldNameAndLanguage(entityType, entityId, fieldName, lang)
                .orElseGet(() -> {
                    Translation t = new Translation();
                    t.setEntityType(entityType);
                    t.setEntityId(entityId);
                    t.setFieldName(fieldName);
                    t.setLanguage(lang);
                    return t;
                });

        translation.setTranslationText(text);
        translation.setUpdatedAt(Instant.now());
        return translationRepository.save(translation);
    }

    @Transactional(readOnly = true)
    public List<Translation> getTranslations(String entityType, UUID entityId) {
        return translationRepository.findAllByEntityTypeAndEntityId(entityType, entityId);
    }
}
