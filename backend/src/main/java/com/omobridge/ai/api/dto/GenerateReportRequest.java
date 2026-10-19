package com.omobridge.ai.api.dto;

import jakarta.validation.constraints.NotBlank;

public record GenerateReportRequest(
        @NotBlank(message = "Report type is required")
        String reportType,

        @NotBlank(message = "Period is required")
        String period,

        String language
) {}
