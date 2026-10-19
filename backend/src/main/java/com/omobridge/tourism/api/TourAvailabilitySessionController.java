package com.omobridge.tourism.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.tourism.api.dto.SessionCreateRequest;
import com.omobridge.tourism.api.dto.SessionResponse;
import com.omobridge.tourism.domain.SessionStatus;
import com.omobridge.tourism.service.TourAvailabilitySessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tourism")
@RequiredArgsConstructor
@Tag(name = "Tour Availability Sessions", description = "Endpoints for managing and querying session capacities and schedules")
public class TourAvailabilitySessionController {

    private final TourAvailabilitySessionService sessionService;

    @GetMapping("/packages/{packageId}/sessions")
    @Operation(summary = "Query available sessions for a tour package on a given date")
    public ResponseEntity<ApiResponse<List<SessionResponse>>> getSessions(
            @PathVariable UUID packageId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        List<SessionResponse> sessions = sessionService.getPublicSessionsForPackage(packageId, date);
        return ResponseEntity.ok(ApiResponse.ok(sessions));
    }

    @PostMapping("/packages/{packageId}/sessions")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Create an availability session for a tour package")
    public ResponseEntity<ApiResponse<SessionResponse>> createSession(
            @PathVariable UUID packageId,
            @Valid @RequestBody SessionCreateRequest request,
            Authentication authentication
    ) {
        SessionResponse response = sessionService.createSession(authentication, packageId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Session created successfully", response));
    }

    @PatchMapping("/sessions/{sessionId}/status")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Update session status (OPEN, CLOSED, CANCELLED)")
    public ResponseEntity<ApiResponse<SessionResponse>> updateSessionStatus(
            @PathVariable UUID sessionId,
            @RequestParam SessionStatus status,
            Authentication authentication
    ) {
        SessionResponse response = sessionService.updateSessionStatus(authentication, sessionId, status);
        return ResponseEntity.ok(ApiResponse.ok("Session status updated", response));
    }
}
