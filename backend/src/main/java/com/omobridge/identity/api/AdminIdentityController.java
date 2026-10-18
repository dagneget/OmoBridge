package com.omobridge.identity.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.identity.api.dto.DeliveryProviderResponse;
import com.omobridge.identity.api.dto.GuideResponse;
import com.omobridge.identity.api.dto.UserProfileResponse;
import com.omobridge.identity.domain.UserStatus;
import com.omobridge.identity.service.AdminIdentityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Admin Identity & Compliance", description = "Platform and tourism authority verification and account controls")
public class AdminIdentityController {

    private final AdminIdentityService adminIdentityService;

    @PatchMapping("/delivery-providers/{id}/approve")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Approve and verify a delivery provider")
    public ResponseEntity<ApiResponse<DeliveryProviderResponse>> approveDeliveryProvider(@PathVariable UUID id) {
        DeliveryProviderResponse response = adminIdentityService.verifyDeliveryProvider(id, true);
        return ResponseEntity.ok(ApiResponse.ok("Delivery provider approved", response));
    }

    @PatchMapping("/delivery-providers/{id}/reject")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Reject a delivery provider")
    public ResponseEntity<ApiResponse<DeliveryProviderResponse>> rejectDeliveryProvider(@PathVariable UUID id) {
        DeliveryProviderResponse response = adminIdentityService.verifyDeliveryProvider(id, false);
        return ResponseEntity.ok(ApiResponse.ok("Delivery provider rejected", response));
    }

    @PatchMapping("/guides/{id}/approve")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'TOURISM_AUTHORITY')")
    @Operation(summary = "Approve and verify a tour guide")
    public ResponseEntity<ApiResponse<GuideResponse>> approveGuide(@PathVariable UUID id) {
        GuideResponse response = adminIdentityService.verifyGuide(id, true);
        return ResponseEntity.ok(ApiResponse.ok("Tour guide approved", response));
    }

    @PatchMapping("/guides/{id}/reject")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'TOURISM_AUTHORITY')")
    @Operation(summary = "Reject a tour guide")
    public ResponseEntity<ApiResponse<GuideResponse>> rejectGuide(@PathVariable UUID id) {
        GuideResponse response = adminIdentityService.verifyGuide(id, false);
        return ResponseEntity.ok(ApiResponse.ok("Tour guide rejected", response));
    }

    @PatchMapping("/enterprises/{id}/approve")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Approve a community micro-enterprise")
    public ResponseEntity<ApiResponse<Void>> approveEnterprise(@PathVariable UUID id) {
        adminIdentityService.verifyEnterprise(id, true);
        return ResponseEntity.ok(ApiResponse.ok("Enterprise approved", null));
    }

    @PatchMapping("/users/{id}/status")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Change a user account status (ACTIVE, SUSPENDED, DEACTIVATED)")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateUserStatus(
            @PathVariable UUID id,
            @RequestParam UserStatus status
    ) {
        UserProfileResponse response = adminIdentityService.updateUserStatus(id, status);
        return ResponseEntity.ok(ApiResponse.ok("User status updated", response));
    }
}
