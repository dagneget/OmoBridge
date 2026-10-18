package com.omobridge.integrations.voice;

/**
 * Placeholder interface for automated voice IVR notifications and callbacks.
 * Supports South Omo local dialects (e.g., Hamer, Banna, Daasanach) where text literacy may be limited.
 */
public interface VoiceGateway {

    record VoiceCallResult(boolean initiated, String callSid, String message) {}

    VoiceCallResult initiateCall(String phoneNumber, String audioPromptUrl);
}
