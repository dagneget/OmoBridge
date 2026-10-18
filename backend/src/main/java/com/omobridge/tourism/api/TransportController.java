package com.omobridge.tourism.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.tourism.api.dto.TransportRequest;
import com.omobridge.tourism.domain.TransportService;
import com.omobridge.tourism.service.LocalTransportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Transport & Logistics", description = "Endpoints for discovering and managing local transport options")
public class TransportController {

    private final LocalTransportService transportService;

    @GetMapping("/tourism/transports")
    @Operation(summary = "Publicly browse active transport services")
    public ResponseEntity<ApiResponse<List<TransportService>>> getPublicTransports() {
        return ResponseEntity.ok(ApiResponse.ok(transportService.getPublicTransports()));
    }

    @GetMapping("/enterprises/{enterpriseId}/tourism/transports")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "List transport services offered by an enterprise")
    public ResponseEntity<ApiResponse<List<TransportService>>> getEnterpriseTransports(
            @PathVariable UUID enterpriseId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.ok(transportService.getEnterpriseTransports(authentication, enterpriseId)));
    }

    @PostMapping("/enterprises/{enterpriseId}/tourism/transports")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Create a transport service listing")
    public ResponseEntity<ApiResponse<TransportService>> createTransport(
            @PathVariable UUID enterpriseId,
            @Valid @RequestBody TransportRequest request,
            Authentication authentication
    ) {
        TransportService created = transportService.createTransport(authentication, enterpriseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Transport service created successfully", created));
    }

    @PutMapping("/enterprises/{enterpriseId}/tourism/transports/{id}")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Update transport service listing")
    public ResponseEntity<ApiResponse<TransportService>> updateTransport(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID id,
            @Valid @RequestBody TransportRequest request,
            Authentication authentication
    ) {
        TransportService updated = transportService.updateTransport(authentication, id, request);
        return ResponseEntity.ok(ApiResponse.ok("Transport service updated successfully", updated));
    }

    @DeleteMapping("/enterprises/{enterpriseId}/tourism/transports/{id}")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Delete transport service listing")
    public ResponseEntity<ApiResponse<Void>> deleteTransport(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID id,
            Authentication authentication
    ) {
        transportService.deleteTransport(authentication, id);
        return ResponseEntity.ok(ApiResponse.ok("Transport service deleted successfully", null));
    }
}
