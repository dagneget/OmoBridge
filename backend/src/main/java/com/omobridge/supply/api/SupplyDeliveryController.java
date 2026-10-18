package com.omobridge.supply.api;

import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.supply.api.dto.SupplyDeliveryCreateRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryInspectionRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryResponse;
import com.omobridge.supply.service.SupplyDeliveryService;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/supply-deliveries")
@RequiredArgsConstructor
@Tag(name = "Supply Deliveries", description = "Farmer raw-material deliveries and quality inspection")
public class SupplyDeliveryController {

    private final SupplyDeliveryService supplyDeliveryService;
    private final OwnershipService ownershipService;

    @PostMapping
    @PreAuthorize("@ownershipService.isEnterpriseMember(authentication, #request.enterpriseId()) or hasRole('ADMIN')")
    @Operation(summary = "Record incoming farmer delivery")
    public ResponseEntity<ApiResponse<SupplyDeliveryResponse>> recordDelivery(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SupplyDeliveryCreateRequest request) {
        SupplyDeliveryResponse response = supplyDeliveryService.recordDelivery(
                request.enterpriseId(), principal.getId(), request
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PatchMapping("/{id}/inspect")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Inspect delivery: grade, accept, reject and generate payable")
    public ResponseEntity<ApiResponse<SupplyDeliveryResponse>> inspectDelivery(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication,
            @Valid @RequestBody SupplyDeliveryInspectionRequest request) {
        SupplyDeliveryResponse delivery = supplyDeliveryService.getDeliveryById(id);
        if (!ownershipService.isEnterpriseMember(authentication, delivery.enterpriseId()) &&
                principal.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new ForbiddenException("Only members of the receiving enterprise may inspect this delivery");
        }

        SupplyDeliveryResponse response = supplyDeliveryService.inspectDelivery(id, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cancel supply delivery before payments are settled")
    public ResponseEntity<ApiResponse<SupplyDeliveryResponse>> cancelDelivery(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication,
            @RequestParam(required = false) String reason) {
        SupplyDeliveryResponse delivery = supplyDeliveryService.getDeliveryById(id);
        if (!ownershipService.isEnterpriseMember(authentication, delivery.enterpriseId()) &&
                principal.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new ForbiddenException("Only enterprise members may cancel this delivery");
        }

        SupplyDeliveryResponse response = supplyDeliveryService.cancelDelivery(id, principal.getId(), reason);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get supply delivery by ID")
    public ResponseEntity<ApiResponse<SupplyDeliveryResponse>> getDeliveryById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication) {
        SupplyDeliveryResponse delivery = supplyDeliveryService.getDeliveryById(id);

        boolean isEnterprise = ownershipService.isEnterpriseMember(authentication, delivery.enterpriseId());
        boolean isFarmer = ownershipService.isOwnFarmer(authentication, delivery.farmerId());
        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isEnterprise && !isFarmer && !isAdmin) {
            throw new ForbiddenException("You do not have access to this delivery");
        }

        return ResponseEntity.ok(ApiResponse.ok(delivery));
    }

    @GetMapping("/enterprises/{enterpriseId}")
    @PreAuthorize("@ownershipService.isEnterpriseMember(authentication, #enterpriseId) or hasRole('ADMIN')")
    @Operation(summary = "List deliveries received by enterprise")
    public ResponseEntity<ApiResponse<List<SupplyDeliveryResponse>>> getEnterpriseDeliveries(
            @PathVariable UUID enterpriseId) {
        return ResponseEntity.ok(ApiResponse.ok(supplyDeliveryService.getEnterpriseDeliveries(enterpriseId)));
    }
}
