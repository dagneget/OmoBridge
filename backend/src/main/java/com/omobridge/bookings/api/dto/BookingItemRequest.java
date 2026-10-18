package com.omobridge.bookings.api.dto;

import com.omobridge.bookings.domain.BookingItemType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record BookingItemRequest(
    @NotNull(message = "Item type is required")
    BookingItemType itemType,

    @NotNull(message = "Item ID is required")
    UUID itemId,

    @Min(value = 1, message = "Quantity must be at least 1")
    int quantity
) {}
