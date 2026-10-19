package com.omobridge.tourism.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.ConflictException;
import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.tourism.api.dto.SessionCreateRequest;
import com.omobridge.tourism.api.dto.SessionResponse;
import com.omobridge.tourism.domain.SessionStatus;
import com.omobridge.tourism.domain.TourAvailabilitySession;
import com.omobridge.tourism.domain.TourAvailabilitySessionRepository;
import com.omobridge.tourism.domain.TourPackage;
import com.omobridge.tourism.domain.TourPackageRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TourAvailabilitySessionService {

    private final TourAvailabilitySessionRepository sessionRepository;
    private final TourPackageRepository packageRepository;
    private final OwnershipService ownershipService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<SessionResponse> getPublicSessionsForPackage(UUID packageId, LocalDate sessionDate) {
        LocalDate targetDate = sessionDate != null ? sessionDate : LocalDate.now();
        return sessionRepository.findAllByTourPackageIdAndSessionDate(packageId, targetDate).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SessionResponse createSession(Authentication authentication, UUID packageId, SessionCreateRequest request) {
        TourPackage pkg = packageRepository.findById(packageId)
                .orElseThrow(() -> new ResourceNotFoundException("TourPackage", packageId));

        if (!ownershipService.isEnterpriseMember(authentication, pkg.getEnterprise().getId())) {
            throw new ForbiddenException("Access denied: You are not an active member of the owning enterprise");
        }

        // Check duplicate session on package + date + start time
        if (sessionRepository.findByTourPackageIdAndSessionDateAndStartTime(
                packageId, request.sessionDate(), request.startTime()).isPresent()) {
            throw new ConflictException("A session already exists for this package at the specified date and start time");
        }

        TourAvailabilitySession session = new TourAvailabilitySession();
        session.setTourPackage(pkg);
        session.setSessionDate(request.sessionDate());
        session.setStartTime(request.startTime());
        session.setCapacity(request.capacity());
        session.setBookedCount(0);
        session.setStatus(SessionStatus.OPEN);

        TourAvailabilitySession saved = sessionRepository.save(session);
        auditService.record("CREATE_AVAILABILITY_SESSION", "AVAILABILITY_SESSION", saved.getId(), request);

        return toResponse(saved);
    }

    @Transactional
    public SessionResponse updateSessionStatus(Authentication authentication, UUID sessionId, SessionStatus newStatus) {
        TourAvailabilitySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("TourAvailabilitySession", sessionId));

        if (!ownershipService.isEnterpriseMember(authentication, session.getTourPackage().getEnterprise().getId())) {
            throw new ForbiddenException("Access denied: You are not an active member of the owning enterprise");
        }

        session.setStatus(newStatus);
        TourAvailabilitySession saved = sessionRepository.save(session);
        auditService.record("UPDATE_SESSION_STATUS", "AVAILABILITY_SESSION", saved.getId(), newStatus);

        return toResponse(saved);
    }

    private SessionResponse toResponse(TourAvailabilitySession session) {
        return new SessionResponse(
                session.getId(),
                session.getTourPackage().getId(),
                session.getSessionDate(),
                session.getStartTime(),
                session.getCapacity(),
                session.getBookedCount(),
                session.getAvailableCapacity(),
                session.getStatus()
        );
    }
}
