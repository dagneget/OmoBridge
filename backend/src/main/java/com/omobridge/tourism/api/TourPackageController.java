package com.omobridge.tourism.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.tourism.api.dto.TourPackageRequest;
import com.omobridge.tourism.api.dto.TourPackageResponse;
import com.omobridge.tourism.service.TourPackageService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Tourism Packages & Experiences", description = "Endpoints for discovering and managing cultural tours and packages")
public class TourPackageController {

    private final TourPackageService tourPackageService;

    @GetMapping("/tourism/packages")
    @Operation(summary = "Publicly browse active cultural tours and packages")
    public ResponseEntity<ApiResponse<List<TourPackageResponse>>> getPublicPackages(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "en") String lang
    ) {
        List<TourPackageResponse> packages = tourPackageService.getPublicPackages(category, lang);
        return ResponseEntity.ok(ApiResponse.ok(packages));
    }

    @GetMapping("/tourism/packages/{id}")
    @Operation(summary = "Get detailed information for a tour package")
    public ResponseEntity<ApiResponse<TourPackageResponse>> getPublicPackageById(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "en") String lang
    ) {
        TourPackageResponse pkg = tourPackageService.getPublicPackageById(id, lang);
        return ResponseEntity.ok(ApiResponse.ok(pkg));
    }

    @GetMapping("/enterprises/{enterpriseId}/tourism/packages")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "List all packages owned by an enterprise")
    public ResponseEntity<ApiResponse<List<TourPackageResponse>>> getEnterprisePackages(
            @PathVariable UUID enterpriseId,
            Authentication authentication
    ) {
        List<TourPackageResponse> packages = tourPackageService.getEnterprisePackages(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(packages));
    }

    @PostMapping("/enterprises/{enterpriseId}/tourism/packages")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Create a new tour package for an enterprise")
    public ResponseEntity<ApiResponse<TourPackageResponse>> createPackage(
            @PathVariable UUID enterpriseId,
            @Valid @RequestBody TourPackageRequest request,
            Authentication authentication
    ) {
        TourPackageResponse response = tourPackageService.createPackage(authentication, enterpriseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tour package created successfully", response));
    }

    @PutMapping("/enterprises/{enterpriseId}/tourism/packages/{id}")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Update an existing tour package")
    public ResponseEntity<ApiResponse<TourPackageResponse>> updatePackage(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID id,
            @Valid @RequestBody TourPackageRequest request,
            Authentication authentication
    ) {
        TourPackageResponse response = tourPackageService.updatePackage(authentication, id, request);
        return ResponseEntity.ok(ApiResponse.ok("Tour package updated successfully", response));
    }

    @DeleteMapping("/enterprises/{enterpriseId}/tourism/packages/{id}")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Delete a tour package")
    public ResponseEntity<ApiResponse<Void>> deletePackage(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID id,
            Authentication authentication
    ) {
        tourPackageService.deletePackage(authentication, id);
        return ResponseEntity.ok(ApiResponse.ok("Tour package deleted successfully", null));
    }
}
