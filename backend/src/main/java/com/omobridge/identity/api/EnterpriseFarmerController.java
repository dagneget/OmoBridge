package com.omobridge.identity.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.identity.api.dto.FarmerResponse;
import com.omobridge.identity.service.EnterpriseFarmerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/enterprises/{enterpriseId}/farmers")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Enterprise Farmers", description = "Endpoints for enterprises to manage and approve affiliated farmers")
public class EnterpriseFarmerController {

    private final EnterpriseFarmerService enterpriseFarmerService;

    @GetMapping
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @Operation(summary = "List all farmers affiliated with this enterprise")
    public ResponseEntity<ApiResponse<List<FarmerResponse>>> getFarmers(
            @PathVariable UUID enterpriseId,
            Authentication authentication
    ) {
        List<FarmerResponse> farmers = enterpriseFarmerService.getFarmersForEnterprise(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(farmers));
    }

    @PatchMapping("/{farmerId}/approve")
    @PreAuthorize("hasRole('MICRO_ENTERPRISE')")
    @Operation(summary = "Approve a farmer for this enterprise")
    public ResponseEntity<ApiResponse<FarmerResponse>> approveFarmer(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID farmerId,
            Authentication authentication
    ) {
        FarmerResponse response = enterpriseFarmerService.approveFarmer(authentication, enterpriseId, farmerId);
        return ResponseEntity.ok(ApiResponse.ok("Farmer approved successfully", response));
    }

    @PatchMapping("/{farmerId}/reject")
    @PreAuthorize("hasRole('MICRO_ENTERPRISE')")
    @Operation(summary = "Reject a farmer for this enterprise")
    public ResponseEntity<ApiResponse<FarmerResponse>> rejectFarmer(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID farmerId,
            Authentication authentication
    ) {
        FarmerResponse response = enterpriseFarmerService.rejectFarmer(authentication, enterpriseId, farmerId);
        return ResponseEntity.ok(ApiResponse.ok("Farmer rejected", response));
    }

    @PostMapping("/{farmerId}/link")
    @PreAuthorize("hasRole('MICRO_ENTERPRISE')")
    @Operation(summary = "Link an existing farmer to this enterprise")
    public ResponseEntity<ApiResponse<FarmerResponse>> linkFarmer(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID farmerId,
            Authentication authentication
    ) {
        FarmerResponse response = enterpriseFarmerService.linkFarmer(authentication, enterpriseId, farmerId);
        return ResponseEntity.ok(ApiResponse.ok("Farmer linked successfully", response));
    }
}
