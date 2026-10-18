package com.omobridge.tourism.domain;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TourAvailabilitySessionRepository extends JpaRepository<TourAvailabilitySession, UUID> {

    List<TourAvailabilitySession> findAllByTourPackageIdAndSessionDate(UUID packageId, LocalDate sessionDate);

    List<TourAvailabilitySession> findAllByTourPackageIdAndSessionDateAndStatus(UUID packageId, LocalDate sessionDate, SessionStatus status);

    Optional<TourAvailabilitySession> findByTourPackageIdAndSessionDateAndStartTime(UUID packageId, LocalDate sessionDate, LocalTime startTime);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM TourAvailabilitySession s WHERE s.id = :id")
    Optional<TourAvailabilitySession> findByIdWithPessimisticLock(@Param("id") UUID id);
}
