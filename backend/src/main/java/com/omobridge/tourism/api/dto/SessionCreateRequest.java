package com.omobridge.tourism.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

public record SessionCreateRequest(
    @NotNull(message = "Session date is required")
    LocalDate sessionDate,

    @NotNull(message = "Start time is required")
    LocalTime startTime,

    @Min(value = 1, message = "Capacity must be at least 1")
    int capacity
) {}
