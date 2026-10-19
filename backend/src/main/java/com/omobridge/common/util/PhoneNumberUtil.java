package com.omobridge.common.util;

import com.omobridge.common.exception.BusinessRuleException;
import java.util.regex.Pattern;

public final class PhoneNumberUtil {

    private static final Pattern ETHIOPIAN_CANONICAL_PATTERN = Pattern.compile("^\\+251[79]\\d{8}$");

    private PhoneNumberUtil() {}

    /**
     * Normalizes Ethiopian mobile phone numbers to the canonical E.164 format: +251XXXXXXXXX.
     * Accepted inputs:
     * - "0911223344" -> "+251911223344"
     * - "0711223344" -> "+251711223344"
     * - "+251 911 22 33 44" -> "+251911223344"
     * - "251911223344" -> "+251911223344"
     * - "00251911223344" -> "+251911223344"
     * - "911223344" -> "+251911223344"
     */
    public static String normalize(String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank()) {
            throw new BusinessRuleException("Phone number cannot be blank");
        }

        // Remove all spaces, dashes, dots, and parentheses
        String cleaned = rawPhone.replaceAll("[\\s\\-\\(\\)\\.]", "");

        if (cleaned.startsWith("00251")) {
            cleaned = "+251" + cleaned.substring(5);
        } else if (cleaned.startsWith("251")) {
            cleaned = "+251" + cleaned.substring(3);
        } else if (cleaned.startsWith("0") && cleaned.length() == 10) {
            cleaned = "+251" + cleaned.substring(1);
        } else if ((cleaned.startsWith("9") || cleaned.startsWith("7")) && cleaned.length() == 9) {
            cleaned = "+251" + cleaned;
        }

        if (!isValid(cleaned)) {
            throw new BusinessRuleException("Invalid Ethiopian phone number: " + rawPhone);
        }

        return cleaned;
    }

    public static boolean isValid(String phone) {
        if (phone == null) return false;
        return ETHIOPIAN_CANONICAL_PATTERN.matcher(phone).matches();
    }
}
