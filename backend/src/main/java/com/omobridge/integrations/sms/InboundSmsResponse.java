package com.omobridge.integrations.sms;

public record InboundSmsResponse(boolean processed, String action, String message) {
    public static InboundSmsResponse recorded(String action, String message) {
        return new InboundSmsResponse(true, action, message);
    }

    public static InboundSmsResponse rejected(String action, String message) {
        return new InboundSmsResponse(false, action, message);
    }
}
