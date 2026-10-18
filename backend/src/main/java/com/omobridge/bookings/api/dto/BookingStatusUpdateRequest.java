package com.omobridge.bookings.api.dto;

import com.omobridge.bookings.domain.BookingStatus;
import jakarta.validation.constraints.NotNull;

public record BookingStatusUpdateRequest(
    @NotNull(message = "New status is required")
    BookingStatus status,

    String notes
) {}
