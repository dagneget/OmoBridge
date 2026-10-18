package com.omobridge.notifications.service;

import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class NotificationTemplateEngine {

    private static final Map<String, Map<String, String>> TEMPLATES = Map.of(
            "SUPPLY_RECEIVED", Map.of(
                    "en", "OmoBridge: Your supply delivery of {quantity} {unit} of {crop} has been received by {enterprise}.",
                    "am", "ኦሞብሪጅ: የ {quantity} {unit} {crop} አቅርቦትዎ በ {enterprise} ተቀብሎ ተረጋግጧል።"
            ),
            "PAYMENT_SENT", Map.of(
                    "en", "OmoBridge: Payment of {amount} ETB has been disbursed to you for reference {reference}.",
                    "am", "ኦሞብሪጅ: {amount} ብር ክፍያ ተፈጽሞልዎታል (ማጣቀሻ: {reference})።"
            ),
            "BOOKING_CONFIRMED", Map.of(
                    "en", "OmoBridge: Your booking {reference} is confirmed for {date}.",
                    "am", "ኦሞብሪጅ: የቦታ ማስያዣ {reference} ለ {date} ተረጋግጧል።"
            ),
            "ORDER_STATUS_UPDATED", Map.of(
                    "en", "OmoBridge: Your order {reference} status has been updated to {status}.",
                    "am", "ኦሞብሪጅ: የትዕዛዝ ቁጥር {reference} ሁኔታ ወደ {status} ተቀይሯል።"
            ),
            "DELIVERY_CHECKPOINT", Map.of(
                    "en", "OmoBridge: Delivery job {jobNo} updated to {status} ({reason}).",
                    "am", "ኦሞብሪጅ: የማጓጓዝ ስራ {jobNo} ወደ {status} ተቀይሯል ({reason})።"
            )
    );

    public String render(String templateCode, String language, Map<String, String> variables) {
        String lang = (language != null && !language.isBlank()) ? language.toLowerCase() : "en";
        Map<String, String> langMap = TEMPLATES.getOrDefault(templateCode, Map.of());
        String template = langMap.getOrDefault(lang, langMap.getOrDefault("en", "OmoBridge notification: " + templateCode));

        String rendered = template;
        if (variables != null) {
            for (Map.Entry<String, String> entry : variables.entrySet()) {
                rendered = rendered.replace("{" + entry.getKey() + "}", entry.getValue() != null ? entry.getValue() : "");
            }
        }
        return rendered;
    }
}
