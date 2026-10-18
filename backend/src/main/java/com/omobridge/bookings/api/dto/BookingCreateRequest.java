package com.omobridge.bookings.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record BookingCreateRequest(
    @NotNull(message = "Enterprise ID is required")
    UUID enterpriseId,

    UUID sessionId,

    UUID assignedGuideId,

    @NotNull(message = "Visit date is required")
    LocalDate visitDate,

    @Min(value = 1, message = "Party size must be at least 1")
    int partySize,

    @NotBlank(message = "Contact name is required")
    String contactName,

    @NotBlank(message = "Contact phone is required")
    String contactPhone,

    String contactEmail,

    String specialRequests,

    @NotEmpty(message = "Booking must include at least one item")
    @Valid
    List<BookingItemRequest> items
) {}
