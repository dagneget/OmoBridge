package com.omobridge.traceability.api;

import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.traceability.api.dto.ProductionBatchCreateRequest;
import com.omobridge.traceability.api.dto.ProductionBatchResponse;
import com.omobridge.traceability.api.dto.TraceRecordUpdateRequest;
import com.omobridge.traceability.api.dto.TraceValidationResponse;
import com.omobridge.traceability.domain.TraceRecord;
import com.omobridge.traceability.service.ProductionBatchService;
import com.omobridge.traceability.service.TraceabilityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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
@RequestMapping("/api/v1/enterprises/{enterpriseId}/production/batches")
@RequiredArgsConstructor
@Tag(name = "Production Batches", description = "Enterprise processing batches, inputs, outputs, losses, and trace tokens")
public class ProductionBatchController {

    private final ProductionBatchService batchService;
    private final TraceabilityService traceabilityService;
    private final OwnershipService ownershipService;
    private final UserRepository userRepository;

    private void checkEnterpriseAccess(Authentication authentication, UUID enterpriseId) {
        if (!ownershipService.isEnterpriseMember(authentication, enterpriseId) &&
                !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new ForbiddenException("Access denied to enterprise production batches");
        }
    }

    private User getActorUser(UserPrincipal principal) {
        return principal != null ? userRepository.findById(principal.getId()).orElse(null) : null;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create and record a production batch (draft or immediate completion)")
    public ResponseEntity<ApiResponse<ProductionBatchResponse>> createBatch(
            @PathVariable UUID enterpriseId,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication,
            @Valid @RequestBody ProductionBatchCreateRequest request
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        ProductionBatchResponse response = batchService.createBatch(enterpriseId, request, getActorUser(principal));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all production batches for enterprise")
    public ResponseEntity<ApiResponse<List<ProductionBatchResponse>>> getBatches(
            @PathVariable UUID enterpriseId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(batchService.getBatches(enterpriseId)));
    }

    @GetMapping("/{batchId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get single production batch by ID")
    public ResponseEntity<ApiResponse<ProductionBatchResponse>> getBatch(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID batchId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(batchService.getBatchById(batchId, enterpriseId)));
    }

    @PostMapping("/{batchId}/complete")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Complete a draft production batch")
    public ResponseEntity<ApiResponse<ProductionBatchResponse>> completeBatch(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID batchId,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        ProductionBatchResponse response = batchService.completeBatch(batchId, enterpriseId, getActorUser(principal));
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{batchId}/cancel")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cancel a production batch and return stock through reversal movements")
    public ResponseEntity<ApiResponse<ProductionBatchResponse>> cancelBatch(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID batchId,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        ProductionBatchResponse response = batchService.cancelBatch(batchId, enterpriseId, reason, getActorUser(principal));
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{batchId}/validation")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Validate chain of custody from farmer delivery to batch outputs")
    public ResponseEntity<ApiResponse<TraceValidationResponse>> validateTrace(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID batchId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(traceabilityService.validateTrace(batchId)));
    }

    @PatchMapping("/{batchId}/trace")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update public story and farmer consent display settings for batch")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateTrace(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID batchId,
            Authentication authentication,
            @RequestBody TraceRecordUpdateRequest request
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        TraceRecord record = traceabilityService.updateTraceRecord(batchId, enterpriseId, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "batchId", batchId,
                "publicToken", record.getPublicToken(),
                "showFarmerNames", record.isShowFarmerNames(),
                "publicStory", record.getPublicStory() != null ? record.getPublicStory() : ""
        )));
    }
}
