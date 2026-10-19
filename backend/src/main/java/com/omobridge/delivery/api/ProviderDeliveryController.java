package com.omobridge.delivery.api;

import com.omobridge.common.exception.UnauthorizedException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.delivery.api.dto.BatchLocationIngestionRequest;
import com.omobridge.delivery.api.dto.DeliveryJobResponse;
import com.omobridge.delivery.api.dto.UpdateDeliveryJobStatusRequest;
import com.omobridge.delivery.service.DeliveryService;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/delivery")
@RequiredArgsConstructor
@Tag(name = "Delivery Provider Operations", description = "Delivery provider job management, status updates, and location telemetry")
public class ProviderDeliveryController {

    private final DeliveryService deliveryService;
    private final UserRepository userRepository;

    private User getActorUser(UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }
        return userRepository.findWithRolesById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }

    @GetMapping("/providers/{providerId}/jobs")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List jobs assigned to this provider")
    public ResponseEntity<ApiResponse<List<DeliveryJobResponse>>> getProviderJobs(
            @PathVariable UUID providerId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User actor = getActorUser(principal);
        List<DeliveryJobResponse> jobs = deliveryService.getProviderJobs(providerId, actor);
        return ResponseEntity.ok(ApiResponse.ok(jobs));
    }

    @PatchMapping("/jobs/{jobId}/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update delivery job status (PICKED_UP, IN_TRANSIT, DELIVERED)")
    public ResponseEntity<ApiResponse<DeliveryJobResponse>> updateJobStatus(
            @PathVariable UUID jobId,
            @Valid @RequestBody UpdateDeliveryJobStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User actor = getActorUser(principal);
        DeliveryJobResponse response = deliveryService.updateJobStatus(jobId, request.newStatus(), request.reason(), actor);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/jobs/{jobId}/locations")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Ingest single or batched GPS locations with device timestamps")
    public ResponseEntity<ApiResponse<Integer>> ingestLocations(
            @PathVariable UUID jobId,
            @Valid @RequestBody BatchLocationIngestionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User actor = getActorUser(principal);
        int stored = deliveryService.ingestLocations(jobId, request.locations(), actor);
        return ResponseEntity.ok(ApiResponse.ok("Stored " + stored + " location points", stored));
    }
}
