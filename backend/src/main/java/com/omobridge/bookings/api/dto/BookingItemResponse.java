package com.omobridge.bookings.api.dto;

import com.omobridge.bookings.domain.BookingItem;
import com.omobridge.bookings.domain.BookingItemType;
import java.math.BigDecimal;
import java.util.UUID;

public record BookingItemResponse(
    UUID id,
    BookingItemType itemType,
    UUID itemId,
    String itemNameSnapshot,
    BigDecimal unitPriceSnapshot,
    int quantity,
    BigDecimal lineTotal
) {
    public static BookingItemResponse fromEntity(BookingItem item) {
        return new BookingItemResponse(
            item.getId(),
            item.getItemType(),
            item.getItemId(),
            item.getItemNameSnapshot(),
            item.getUnitPriceSnapshot(),
            item.getQuantity(),
            item.getLineTotal()
        );
    }
}
