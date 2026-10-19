package com.omobridge.integrations.sms;

public record SmsSendResult(boolean success, String providerReference, String errorMessage) {
    public static SmsSendResult success(String providerReference) {
        return new SmsSendResult(true, providerReference, null);
    }

    public static SmsSendResult failure(String errorMessage) {
        return new SmsSendResult(false, null, errorMessage);
    }
}
