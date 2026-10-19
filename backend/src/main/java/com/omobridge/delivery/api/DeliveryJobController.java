package com.omobridge.delivery.api;

import com.omobridge.common.exception.UnauthorizedException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.delivery.api.dto.CreateDeliveryJobRequest;
import com.omobridge.delivery.api.dto.DeliveryJobResponse;
import com.omobridge.delivery.service.DeliveryService;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/delivery/jobs")
@RequiredArgsConstructor
@Tag(name = "Delivery Jobs Management", description = "Create and dispatch delivery jobs with multi-order consolidation")
public class DeliveryJobController {

    private final DeliveryService deliveryService;
    private final UserRepository userRepository;

    private User getActorUser(UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }
        return userRepository.findWithRolesById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create delivery job for one or multiple paid orders and assign approved provider")
    public ResponseEntity<ApiResponse<DeliveryJobResponse>> createJob(
            @Valid @RequestBody CreateDeliveryJobRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User actor = getActorUser(principal);
        DeliveryJobResponse response = deliveryService.createAndAssignJob(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }
}
