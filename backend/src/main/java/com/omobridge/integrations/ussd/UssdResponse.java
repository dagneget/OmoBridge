package com.omobridge.integrations.ussd;

public record UssdResponse(String message, boolean shouldClose) {
    public static UssdResponse continueSession(String message) {
        return new UssdResponse(message, false);
    }

    public static UssdResponse endSession(String message) {
        return new UssdResponse(message, true);
    }
}
