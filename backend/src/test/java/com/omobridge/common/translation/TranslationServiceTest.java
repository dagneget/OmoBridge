package com.omobridge.common.translation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TranslationServiceTest {

    @Mock
    private TranslationRepository translationRepository;

    @InjectMocks
    private TranslationService translationService;

    @Test
    @DisplayName("Should return specific language translation when available")
    void shouldReturnSpecificLanguageTranslation() {
        UUID entityId = UUID.randomUUID();
        Translation translation = new Translation();
        translation.setTranslationText("የቱሪዝም ፓኬጅ");

        when(translationRepository.findByEntityTypeAndEntityIdAndFieldNameAndLanguage(
                "PACKAGE", entityId, "title", "am"
        )).thenReturn(Optional.of(translation));

        String result = translationService.getTranslatedField("PACKAGE", entityId, "title", "am", "Default Title");
        assertThat(result).isEqualTo("የቱሪዝም ፓኬጅ");
    }

    @Test
    @DisplayName("Should fall back to default English translation when specific language missing")
    void shouldFallbackToDefaultLanguage() {
        UUID entityId = UUID.randomUUID();
        Translation enTranslation = new Translation();
        enTranslation.setTranslationText("English Package Title");

        when(translationRepository.findByEntityTypeAndEntityIdAndFieldNameAndLanguage(
                "PACKAGE", entityId, "title", "fr"
        )).thenReturn(Optional.empty());

        when(translationRepository.findByEntityTypeAndEntityIdAndFieldNameAndLanguage(
                "PACKAGE", entityId, "title", "en"
        )).thenReturn(Optional.of(enTranslation));

        String result = translationService.getTranslatedField("PACKAGE", entityId, "title", "fr", "Default Title");
        assertThat(result).isEqualTo("English Package Title");
    }

    @Test
    @DisplayName("Should return provided default value when no translation exists")
    void shouldReturnDefaultValueWhenNoneFound() {
        UUID entityId = UUID.randomUUID();

        when(translationRepository.findByEntityTypeAndEntityIdAndFieldNameAndLanguage(
                "PACKAGE", entityId, "title", "de"
        )).thenReturn(Optional.empty());

        when(translationRepository.findByEntityTypeAndEntityIdAndFieldNameAndLanguage(
                "PACKAGE", entityId, "title", "en"
        )).thenReturn(Optional.empty());

        String result = translationService.getTranslatedField("PACKAGE", entityId, "title", "de", "Fallback Value");
        assertThat(result).isEqualTo("Fallback Value");
    }
}
