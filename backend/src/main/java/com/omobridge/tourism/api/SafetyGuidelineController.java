package com.omobridge.tourism.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.tourism.api.dto.SafetyGuidelineRequest;
import com.omobridge.tourism.domain.SafetyGuideline;
import com.omobridge.tourism.service.SafetyGuidelineService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tourism/guidelines")
@RequiredArgsConstructor
@Tag(name = "Safety Guidelines & Cultural Etiquette", description = "Endpoints for vital travel, cultural, and emergency notices")
public class SafetyGuidelineController {

    private final SafetyGuidelineService safetyGuidelineService;

    @GetMapping
    @Operation(summary = "Publicly list active safety guidelines and emergency contacts")
    public ResponseEntity<ApiResponse<List<SafetyGuideline>>> getPublicGuidelines() {
        return ResponseEntity.ok(ApiResponse.ok(safetyGuidelineService.getPublicGuidelines()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'TOURISM_AUTHORITY')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Create safety guideline")
    public ResponseEntity<ApiResponse<SafetyGuideline>> createGuideline(@Valid @RequestBody SafetyGuidelineRequest request) {
        SafetyGuideline guideline = safetyGuidelineService.createGuideline(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Safety guideline created successfully", guideline));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'TOURISM_AUTHORITY')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Update safety guideline")
    public ResponseEntity<ApiResponse<SafetyGuideline>> updateGuideline(
            @PathVariable UUID id,
            @Valid @RequestBody SafetyGuidelineRequest request
    ) {
        SafetyGuideline guideline = safetyGuidelineService.updateGuideline(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Safety guideline updated successfully", guideline));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'TOURISM_AUTHORITY')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Delete safety guideline")
    public ResponseEntity<ApiResponse<Void>> deleteGuideline(@PathVariable UUID id) {
        safetyGuidelineService.deleteGuideline(id);
        return ResponseEntity.ok(ApiResponse.ok("Safety guideline deleted successfully", null));
    }
}
