package com.omobridge.bookings.api.dto;

import com.omobridge.bookings.domain.Booking;
import com.omobridge.bookings.domain.BookingStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record BookingResponse(
    UUID id,
    String bookingCode,
    UUID enterpriseId,
    String enterpriseName,
    UUID buyerId,
    String buyerName,
    UUID sessionId,
    UUID assignedGuideId,
    String assignedGuideName,
    LocalDate visitDate,
    int partySize,
    String contactName,
    String contactPhone,
    String contactEmail,
    String specialRequests,
    BigDecimal subtotal,
    BigDecimal taxAmount,
    BigDecimal feeAmount,
    BigDecimal totalAmount,
    String currency,
    BookingStatus status,
    List<BookingItemResponse> items
) {
    public static BookingResponse fromEntity(Booking booking) {
        return new BookingResponse(
            booking.getId(),
            booking.getBookingCode(),
            booking.getEnterprise() != null ? booking.getEnterprise().getId() : null,
            booking.getEnterprise() != null ? booking.getEnterprise().getName() : null,
            booking.getBuyer() != null ? booking.getBuyer().getId() : null,
            booking.getBuyer() != null ? booking.getBuyer().getFullName() : null,
            booking.getSession() != null ? booking.getSession().getId() : null,
            booking.getAssignedGuide() != null ? booking.getAssignedGuide().getId() : null,
            booking.getAssignedGuide() != null && booking.getAssignedGuide().getUser() != null
                ? booking.getAssignedGuide().getUser().getFullName() : null,
            booking.getVisitDate(),
            booking.getPartySize(),
            booking.getContactName(),
            booking.getContactPhone(),
            booking.getContactEmail(),
            booking.getSpecialRequests(),
            booking.getSubtotal(),
            booking.getTaxAmount(),
            booking.getFeeAmount(),
            booking.getTotalAmount(),
            booking.getCurrency(),
            booking.getStatus(),
            booking.getItems() != null ? booking.getItems().stream().map(BookingItemResponse::fromEntity).toList() : List.of()
        );
    }
}
