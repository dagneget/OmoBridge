package com.omobridge.bookings.domain;

import com.omobridge.common.domain.BaseEntity;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.Guide;
import com.omobridge.identity.domain.User;
import com.omobridge.tourism.domain.TourAvailabilitySession;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "bookings")
public class Booking extends BaseEntity {

    @Column(name = "booking_code", nullable = false, unique = true, length = 30)
    private String bookingCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enterprise_id", nullable = false)
    private Enterprise enterprise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private TourAvailabilitySession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_guide_id")
    private Guide assignedGuide;

    @Column(name = "visit_date", nullable = false)
    private LocalDate visitDate;

    @Column(name = "party_size", nullable = false)
    private int partySize;

    @Column(name = "contact_name", nullable = false, length = 150)
    private String contactName;

    @Column(name = "contact_phone", nullable = false, length = 30)
    private String contactPhone;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "special_requests", columnDefinition = "TEXT")
    private String specialRequests;

    @Column(name = "subtotal", nullable = false, precision = 14, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "tax_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "fee_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal feeAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "ETB";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private BookingStatus status = BookingStatus.REQUESTED;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BookingItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BookingStatusHistory> statusHistory = new ArrayList<>();

    public void addItem(BookingItem item) {
        items.add(item);
        item.setBooking(this);
    }

    public void addStatusHistory(BookingStatus previousStatus, BookingStatus newStatus, User changedByUser, String notes) {
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(this);
        history.setPreviousStatus(previousStatus);
        history.setNewStatus(newStatus);
        history.setChangedByUser(changedByUser);
        history.setNotes(notes);
        this.statusHistory.add(history);
    }
}
