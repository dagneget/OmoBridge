package com.omobridge.bookings.api;

import com.omobridge.bookings.api.dto.BookingCreateRequest;
import com.omobridge.bookings.api.dto.BookingResponse;
import com.omobridge.bookings.api.dto.BookingStatusUpdateRequest;
import com.omobridge.bookings.service.BookingService;
import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.common.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
@Tag(name = "Bookings", description = "Tourism bookings lifecycle and lookup")
public class BookingController {

    private final BookingService bookingService;
    private final OwnershipService ownershipService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create tourism booking with session reservation and pricing calculation")
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody BookingCreateRequest request) {
        BookingResponse response = bookingService.createBooking(principal.getId(), request, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List current user's bookings")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getMyBookings(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getMyBookings(principal.getId())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get booking by ID")
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication) {
        BookingResponse booking = bookingService.getBookingById(id);

        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isBuyer = booking.buyerId() != null && booking.buyerId().equals(principal.getId());
        boolean isEnterprise = booking.enterpriseId() != null && ownershipService.isEnterpriseMember(authentication, booking.enterpriseId());
        boolean isGuide = booking.assignedGuideId() != null && ownershipService.isAssignedGuide(authentication, booking.assignedGuideId());

        if (!isAdmin && !isBuyer && !isEnterprise && !isGuide) {
            throw new ForbiddenException("You do not have permission to view this booking");
        }

        return ResponseEntity.ok(ApiResponse.ok(booking));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update booking status (confirm, decline, complete, cancel)")
    public ResponseEntity<ApiResponse<BookingResponse>> updateBookingStatus(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication,
            @Valid @RequestBody BookingStatusUpdateRequest request) {
        BookingResponse existing = bookingService.getBookingById(id);

        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isEnterprise = existing.enterpriseId() != null && ownershipService.isEnterpriseMember(authentication, existing.enterpriseId());
        boolean isBuyer = existing.buyerId() != null && existing.buyerId().equals(principal.getId());
        boolean isGuide = existing.assignedGuideId() != null && ownershipService.isAssignedGuide(authentication, existing.assignedGuideId());

        if (!isAdmin && !isEnterprise && !isBuyer && !isGuide) {
            throw new ForbiddenException("You do not have permission to update this booking");
        }

        BookingResponse updated = bookingService.updateBookingStatus(id, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @GetMapping("/enterprises/{enterpriseId}")
    @PreAuthorize("@ownershipService.isEnterpriseMember(authentication, #enterpriseId) or hasRole('ADMIN')")
    @Operation(summary = "List bookings for an enterprise")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getEnterpriseBookings(
            @PathVariable UUID enterpriseId) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getEnterpriseBookings(enterpriseId)));
    }

    @GetMapping("/guides/{guideId}")
    @PreAuthorize("@ownershipService.isAssignedGuide(authentication, #guideId) or hasRole('ADMIN')")
    @Operation(summary = "List bookings assigned to a guide")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getGuideBookings(
            @PathVariable UUID guideId) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getGuideBookings(guideId)));
    }
}
