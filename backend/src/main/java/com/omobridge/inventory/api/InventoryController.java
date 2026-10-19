package com.omobridge.inventory.api;

import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.inventory.api.dto.InventoryAdjustmentRequest;
import com.omobridge.inventory.api.dto.InventoryDisposalRequest;
import com.omobridge.inventory.api.dto.InventoryLocationRequest;
import com.omobridge.inventory.api.dto.InventoryLocationResponse;
import com.omobridge.inventory.api.dto.InventoryLotResponse;
import com.omobridge.inventory.api.dto.InventoryMovementResponse;
import com.omobridge.inventory.api.dto.InventoryTransferRequest;
import com.omobridge.inventory.api.dto.ReconciliationReportResponse;
import com.omobridge.inventory.domain.LotStatus;
import com.omobridge.inventory.service.InventoryService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/enterprises/{enterpriseId}/inventory")
@RequiredArgsConstructor
@Tag(name = "Inventory", description = "Raw materials and finished goods inventory lots, locations, and movements")
public class InventoryController {

    private final InventoryService inventoryService;
    private final OwnershipService ownershipService;
    private final UserRepository userRepository;

    private void checkEnterpriseAccess(Authentication authentication, UUID enterpriseId) {
        if (!ownershipService.isEnterpriseMember(authentication, enterpriseId) &&
                !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new ForbiddenException("Access denied to enterprise inventory");
        }
    }

    private User getActorUser(UserPrincipal principal) {
        return principal != null ? userRepository.findById(principal.getId()).orElse(null) : null;
    }

    @PostMapping("/locations")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create an inventory location")
    public ResponseEntity<ApiResponse<InventoryLocationResponse>> createLocation(
            @PathVariable UUID enterpriseId,
            Authentication authentication,
            @Valid @RequestBody InventoryLocationRequest request
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        InventoryLocationResponse response = inventoryService.createLocation(enterpriseId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping("/locations")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all inventory locations for enterprise")
    public ResponseEntity<ApiResponse<List<InventoryLocationResponse>>> getLocations(
            @PathVariable UUID enterpriseId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getLocations(enterpriseId)));
    }

    @GetMapping("/lots")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all inventory lots for enterprise")
    public ResponseEntity<ApiResponse<List<InventoryLotResponse>>> getLots(
            @PathVariable UUID enterpriseId,
            @RequestParam(required = false) LotStatus status,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getEnterpriseLots(enterpriseId, status)));
    }

    @GetMapping("/lots/{lotId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get single inventory lot by ID")
    public ResponseEntity<ApiResponse<InventoryLotResponse>> getLot(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID lotId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getLotById(lotId, enterpriseId)));
    }

    @GetMapping("/lots/{lotId}/movements")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List movement audit trail for a lot")
    public ResponseEntity<ApiResponse<List<InventoryMovementResponse>>> getMovements(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID lotId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getLotMovements(lotId, enterpriseId)));
    }

    @PostMapping("/lots/{lotId}/adjustments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Record quantity adjustment on a lot")
    public ResponseEntity<ApiResponse<InventoryMovementResponse>> adjust(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID lotId,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication,
            @Valid @RequestBody InventoryAdjustmentRequest request
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        InventoryMovementResponse response = inventoryService.adjust(lotId, enterpriseId, request, getActorUser(principal));
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/lots/{lotId}/transfers")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Transfer lot or partial lot to another location")
    public ResponseEntity<ApiResponse<InventoryMovementResponse>> transfer(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID lotId,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication,
            @Valid @RequestBody InventoryTransferRequest request
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        InventoryMovementResponse response = inventoryService.transfer(lotId, enterpriseId, request, getActorUser(principal));
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/lots/{lotId}/disposals")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Dispose spoiled/damaged lot quantity")
    public ResponseEntity<ApiResponse<InventoryMovementResponse>> dispose(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID lotId,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication,
            @Valid @RequestBody InventoryDisposalRequest request
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        InventoryMovementResponse response = inventoryService.dispose(lotId, enterpriseId, request, getActorUser(principal));
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/reconciliation")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Reconcile all lots in enterprise")
    public ResponseEntity<ApiResponse<List<ReconciliationReportResponse>>> reconcileEnterprise(
            @PathVariable UUID enterpriseId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.reconcileEnterpriseLots(enterpriseId)));
    }

    @GetMapping("/lots/{lotId}/reconciliation")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Reconcile single lot against movements")
    public ResponseEntity<ApiResponse<ReconciliationReportResponse>> reconcileLot(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID lotId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.reconcileLotBalance(lotId)));
    }
}
