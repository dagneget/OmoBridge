package com.omobridge.bookings.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.bookings.api.dto.BookingCreateRequest;
import com.omobridge.bookings.api.dto.BookingItemRequest;
import com.omobridge.bookings.api.dto.BookingResponse;
import com.omobridge.bookings.api.dto.BookingStatusUpdateRequest;
import com.omobridge.bookings.domain.Booking;
import com.omobridge.bookings.domain.BookingItem;
import com.omobridge.bookings.domain.BookingRepository;
import com.omobridge.bookings.domain.BookingStatus;
import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.idempotency.IdempotencyRecord;
import com.omobridge.common.idempotency.IdempotencyService;
import com.omobridge.common.outbox.TransactionalOutboxService;
import com.omobridge.common.util.CodeGenerator;
import com.omobridge.common.util.MoneyUtil;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.Guide;
import com.omobridge.identity.domain.GuideRepository;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.identity.domain.VerificationStatus;
import com.omobridge.pricing.api.dto.PriceBreakdownLine;
import com.omobridge.pricing.api.dto.PriceBreakdownResponse;
import com.omobridge.pricing.service.PricingEngine;
import com.omobridge.tourism.domain.Hotel;
import com.omobridge.tourism.domain.HotelRepository;
import com.omobridge.tourism.domain.SessionStatus;
import com.omobridge.tourism.domain.TourAvailabilitySession;
import com.omobridge.tourism.domain.TourAvailabilitySessionRepository;
import com.omobridge.tourism.domain.TourPackage;
import com.omobridge.tourism.domain.TourPackageRepository;
import com.omobridge.tourism.domain.TransportService;
import com.omobridge.tourism.domain.TransportServiceRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final TourAvailabilitySessionRepository sessionRepository;
    private final TourPackageRepository tourPackageRepository;
    private final HotelRepository hotelRepository;
    private final TransportServiceRepository transportRepository;
    private final GuideRepository guideRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final UserRepository userRepository;
    private final PricingEngine pricingEngine;
    private final CodeGenerator codeGenerator;
    private final AuditService auditService;
    private final TransactionalOutboxService outboxService;
    private final IdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    @Transactional
    public BookingResponse createBooking(UUID buyerUserId, BookingCreateRequest request, String idempotencyKey) {
        String payloadJson = null;
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            try {
                payloadJson = objectMapper.writeValueAsString(request);
            } catch (JsonProcessingException e) {
                payloadJson = request.toString();
            }

            Optional<IdempotencyRecord> existing = idempotencyService.checkOrReserve(idempotencyKey, "CREATE_BOOKING", payloadJson);
            if (existing.isPresent() && existing.get().getResponseBody() != null) {
                try {
                    return objectMapper.readValue(existing.get().getResponseBody(), BookingResponse.class);
                } catch (JsonProcessingException e) {
                    log.warn("Failed to deserialize saved idempotency response, re-evaluating", e);
                }
            }
        }

        Enterprise enterprise = enterpriseRepository.findById(request.enterpriseId())
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with id: " + request.enterpriseId()));

        User buyer = userRepository.findById(buyerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + buyerUserId));

        TourAvailabilitySession session = null;
        if (request.sessionId() != null) {
            session = sessionRepository.findByIdWithPessimisticLock(request.sessionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Session not found with id: " + request.sessionId()));

            if (session.getStatus() != SessionStatus.OPEN) {
                throw new BusinessRuleException("Session is not open for booking. Current status: " + session.getStatus());
            }

            int availableCapacity = session.getCapacity() - session.getBookedCount();
            if (request.partySize() > availableCapacity) {
                throw new BusinessRuleException("Session capacity exceeded. Available: " + availableCapacity + ", requested: " + request.partySize());
            }

            session.setBookedCount(session.getBookedCount() + request.partySize());
        }

        Guide guide = null;
        if (request.assignedGuideId() != null) {
            guide = guideRepository.findById(request.assignedGuideId())
                    .orElseThrow(() -> new ResourceNotFoundException("Guide not found with id: " + request.assignedGuideId()));
            if (guide.getVerificationStatus() != VerificationStatus.VERIFIED) {
                throw new BusinessRuleException("Assigned guide is not approved");
            }
        }

        Booking booking = new Booking();
        booking.setBookingCode(codeGenerator.generateBookingCode());
        booking.setEnterprise(enterprise);
        booking.setBuyer(buyer);
        booking.setSession(session);
        booking.setAssignedGuide(guide);
        booking.setVisitDate(request.visitDate());
        booking.setPartySize(request.partySize());
        booking.setContactName(request.contactName());
        booking.setContactPhone(request.contactPhone());
        booking.setContactEmail(request.contactEmail());
        booking.setSpecialRequests(request.specialRequests());
        booking.setCurrency("ETB");
        booking.setStatus(BookingStatus.REQUESTED);

        BigDecimal subtotal = BigDecimal.ZERO;

        for (BookingItemRequest itemReq : request.items()) {
            BookingItem item = new BookingItem();
            item.setItemType(itemReq.itemType());
            item.setItemId(itemReq.itemId());
            item.setQuantity(itemReq.quantity());

            switch (itemReq.itemType()) {
                case PACKAGE -> {
                    TourPackage tourPackage = tourPackageRepository.findById(itemReq.itemId())
                            .orElseThrow(() -> new ResourceNotFoundException("Tour package not found with id: " + itemReq.itemId()));
                    item.setItemNameSnapshot(tourPackage.getName());
                    item.setUnitPriceSnapshot(MoneyUtil.roundMoney(tourPackage.getPriceAmount()));
                }
                case HOTEL -> {
                    Hotel hotel = hotelRepository.findById(itemReq.itemId())
                            .orElseThrow(() -> new ResourceNotFoundException("Hotel not found with id: " + itemReq.itemId()));
                    item.setItemNameSnapshot(hotel.getName());
                    item.setUnitPriceSnapshot(MoneyUtil.roundMoney(hotel.getPriceFrom()));
                }
                case TRANSPORT -> {
                    TransportService transport = transportRepository.findById(itemReq.itemId())
                            .orElseThrow(() -> new ResourceNotFoundException("Transport service not found with id: " + itemReq.itemId()));
                    item.setItemNameSnapshot(transport.getServiceName());
                    item.setUnitPriceSnapshot(MoneyUtil.roundMoney(transport.getPriceAmount()));
                }
                case GUIDE -> {
                    Guide itemGuide = guideRepository.findById(itemReq.itemId())
                            .orElseThrow(() -> new ResourceNotFoundException("Guide not found with id: " + itemReq.itemId()));
                    item.setItemNameSnapshot("Guide: " + itemGuide.getUser().getFullName());
                    item.setUnitPriceSnapshot(MoneyUtil.roundMoney(itemGuide.getDailyRate()));
                }
            }

            BigDecimal lineTotal = MoneyUtil.roundMoney(
                    item.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(item.getQuantity()))
            );
            item.setLineTotal(lineTotal);
            subtotal = subtotal.add(lineTotal);

            booking.addItem(item);
        }

        booking.setSubtotal(subtotal);

        PriceBreakdownResponse pricingBreakdown = pricingEngine.calculatePricing(
                subtotal, enterprise.getId(), "TOURISM", Instant.now()
        );

        BigDecimal taxAmount = BigDecimal.ZERO;
        BigDecimal feeAmount = BigDecimal.ZERO;

        for (PriceBreakdownLine line : pricingBreakdown.breakdown()) {
            if (line.code() != null && line.code().toUpperCase().contains("TAX")) {
                taxAmount = taxAmount.add(line.amount());
            } else {
                feeAmount = feeAmount.add(line.amount());
            }
        }

        booking.setTaxAmount(MoneyUtil.roundMoney(taxAmount));
        booking.setFeeAmount(MoneyUtil.roundMoney(feeAmount));
        booking.setTotalAmount(MoneyUtil.roundMoney(pricingBreakdown.total()));

        booking.addStatusHistory(null, BookingStatus.REQUESTED, buyer, "Initial booking created");

        Booking savedBooking = bookingRepository.save(booking);

        auditService.recordInCurrentTransaction(
                "CREATE_BOOKING",
                "BOOKING",
                savedBooking.getId(),
                Map.of("bookingCode", savedBooking.getBookingCode(), "total", savedBooking.getTotalAmount())
        );

        outboxService.publishInTransaction(
                "BOOKING_CREATED",
                "BOOKING",
                savedBooking.getId(),
                Map.of("bookingCode", savedBooking.getBookingCode(), "status", savedBooking.getStatus().name())
        );

        BookingResponse response = BookingResponse.fromEntity(savedBooking);

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            try {
                idempotencyService.recordResponse(idempotencyKey, 201, objectMapper.writeValueAsString(response));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize idempotency response", e);
            }
        }

        return response;
    }

    @Transactional
    public BookingResponse updateBookingStatus(UUID bookingId, UUID actorUserId, BookingStatusUpdateRequest request) {
        Booking booking = bookingRepository.findWithDetailsById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + actorUserId));

        BookingStatus currentStatus = booking.getStatus();
        BookingStatus targetStatus = request.status();

        if (!currentStatus.canTransitionTo(targetStatus)) {
            throw new BusinessRuleException("Cannot transition booking from " + currentStatus + " to " + targetStatus);
        }

        // Capacity release on cancel / decline
        if ((targetStatus == BookingStatus.CANCELLED || targetStatus == BookingStatus.DECLINED) && booking.getSession() != null) {
            TourAvailabilitySession session = sessionRepository.findByIdWithPessimisticLock(booking.getSession().getId())
                    .orElse(booking.getSession());
            session.setBookedCount(Math.max(0, session.getBookedCount() - booking.getPartySize()));
        }

        booking.setStatus(targetStatus);
        String notes = request.notes() != null && !request.notes().isBlank()
                ? request.notes()
                : "Transitioned to " + targetStatus;
        booking.addStatusHistory(currentStatus, targetStatus, actor, notes);

        Booking updated = bookingRepository.save(booking);

        auditService.recordInCurrentTransaction(
                "UPDATE_BOOKING_STATUS",
                "BOOKING",
                updated.getId(),
                Map.of("previousStatus", currentStatus.name(), "newStatus", targetStatus.name(), "reason", notes)
        );

        outboxService.publishInTransaction(
                "BOOKING_STATUS_CHANGED",
                "BOOKING",
                updated.getId(),
                Map.of("bookingCode", updated.getBookingCode(), "oldStatus", currentStatus.name(), "newStatus", targetStatus.name())
        );

        return BookingResponse.fromEntity(updated);
    }

    @Transactional(readOnly = true)
    public BookingResponse getBookingById(UUID bookingId) {
        Booking booking = bookingRepository.findWithDetailsById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));
        return BookingResponse.fromEntity(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getMyBookings(UUID buyerId) {
        return bookingRepository.findAllByBuyerIdOrderByCreatedAtDesc(buyerId)
                .stream()
                .map(BookingResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getEnterpriseBookings(UUID enterpriseId) {
        return bookingRepository.findAllByEnterpriseIdOrderByCreatedAtDesc(enterpriseId)
                .stream()
                .map(BookingResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getGuideBookings(UUID guideId) {
        return bookingRepository.findAllByAssignedGuideIdOrderByVisitDateAsc(guideId)
                .stream()
                .map(BookingResponse::fromEntity)
                .toList();
    }
}
