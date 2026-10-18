package com.omobridge.tourism.api.dto;

import com.omobridge.tourism.domain.SessionStatus;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record SessionResponse(
    UUID id,
    UUID packageId,
    LocalDate sessionDate,
    LocalTime startTime,
    int capacity,
    int bookedCount,
    int availableCapacity,
    SessionStatus status
) {}
