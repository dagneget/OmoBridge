package com.omobridge.tourism.api.dto;

import jakarta.validation.constraints.NotBlank;

public record SafetyGuidelineRequest(
    @NotBlank(message = "Title is required")
    String title,

    @NotBlank(message = "Category is required")
    String category,

    @NotBlank(message = "Content is required")
    String content,

    String emergencyContacts,

    Integer displayOrder,

    Boolean isActive
) {}
