package com.omobridge.integrations.ussd;

import jakarta.validation.constraints.NotBlank;

public record UssdRequest(
        @NotBlank(message = "Session ID is required")
        String sessionId,

        @NotBlank(message = "Phone number is required")
        String phoneNumber,

        String text
) {}
