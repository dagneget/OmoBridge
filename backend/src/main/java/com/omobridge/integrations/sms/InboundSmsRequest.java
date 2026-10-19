package com.omobridge.integrations.sms;

import jakarta.validation.constraints.NotBlank;

public record InboundSmsRequest(
        @NotBlank(message = "From phone number is required")
        String from,

        @NotBlank(message = "To phone number is required")
        String to,

        @NotBlank(message = "Message body is required")
        String body,

        String signature
) {}
