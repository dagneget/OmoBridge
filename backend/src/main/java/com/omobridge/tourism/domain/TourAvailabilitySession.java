package com.omobridge.tourism.domain;

import com.omobridge.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "tour_availability_sessions", uniqueConstraints = {
    @UniqueConstraint(name = "uk_package_session_datetime", columnNames = {"package_id", "session_date", "start_time"})
})
public class TourAvailabilitySession extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "package_id", nullable = false)
    private TourPackage tourPackage;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "capacity", nullable = false)
    private int capacity;

    @Column(name = "booked_count", nullable = false)
    private int bookedCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SessionStatus status = SessionStatus.OPEN;

    public int getAvailableCapacity() {
        return Math.max(0, capacity - bookedCount);
    }

    public boolean canBook(int requestedCount) {
        return status == SessionStatus.OPEN && (bookedCount + requestedCount <= capacity);
    }

    public void reserveSeats(int count) {
        if (!canBook(count)) {
            throw new IllegalStateException("Insufficient capacity: " + count + " requested, but only " + getAvailableCapacity() + " available");
        }
        this.bookedCount += count;
        if (this.bookedCount == this.capacity) {
            this.status = SessionStatus.CLOSED;
        }
    }

    public void releaseSeats(int count) {
        this.bookedCount = Math.max(0, this.bookedCount - count);
        if (this.status == SessionStatus.CLOSED && this.bookedCount < this.capacity) {
            this.status = SessionStatus.OPEN;
        }
    }
}
