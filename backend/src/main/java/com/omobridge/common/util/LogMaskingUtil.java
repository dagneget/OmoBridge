package com.omobridge.common.util;

public final class LogMaskingUtil {

    private LogMaskingUtil() {}

    public static String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return "***";
        }
        String clean = phone.trim();
        if (clean.length() <= 6) {
            return "***";
        }
        return clean.substring(0, 5) + "****" + clean.substring(clean.length() - 2);
    }

    public static String maskToken(String token) {
        if (token == null || token.isBlank()) {
            return "***";
        }
        if (token.length() <= 8) {
            return "***";
        }
        return token.substring(0, 5) + "...****";
    }

    public static String maskSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            return "***";
        }
        if (secret.length() <= 4) {
            return "***";
        }
        return secret.substring(0, 3) + "***";
    }
}
