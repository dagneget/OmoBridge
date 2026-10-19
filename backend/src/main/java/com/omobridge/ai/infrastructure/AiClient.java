package com.omobridge.ai.infrastructure;

public interface AiClient {
    String generateNarrative(String systemPrompt, String userPrompt);
}
