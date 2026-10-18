package com.omobridge.bookings.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    @EntityGraph(attributePaths = {"items", "enterprise", "buyer", "session", "assignedGuide"})
    Optional<Booking> findWithDetailsByBookingCode(String bookingCode);

    @EntityGraph(attributePaths = {"items", "enterprise", "buyer", "session", "assignedGuide"})
    Optional<Booking> findWithDetailsById(UUID id);

    List<Booking> findAllByBuyerIdOrderByCreatedAtDesc(UUID buyerId);

    List<Booking> findAllByEnterpriseIdOrderByCreatedAtDesc(UUID enterpriseId);

    List<Booking> findAllByAssignedGuideIdOrderByVisitDateAsc(UUID guideId);
}
