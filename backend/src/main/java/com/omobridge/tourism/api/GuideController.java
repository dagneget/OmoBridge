package com.omobridge.tourism.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.tourism.api.dto.GuideProfileRequest;
import com.omobridge.tourism.api.dto.GuideResponse;
import com.omobridge.tourism.service.GuideService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tourism/guides")
@RequiredArgsConstructor
@Tag(name = "Tourism Guides", description = "Guide profile and public directories")
public class GuideController {

    private final GuideService guideService;

    @GetMapping
    @Operation(summary = "List approved tourism guides")
    public ResponseEntity<ApiResponse<List<GuideResponse>>> listApprovedGuides() {
        return ResponseEntity.ok(ApiResponse.ok(guideService.getApprovedGuides()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get guide profile by id")
    public ResponseEntity<ApiResponse<GuideResponse>> getGuideById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(guideService.getGuideById(id)));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('TOURISM_GUIDE')")
    @Operation(summary = "Get current guide profile")
    public ResponseEntity<ApiResponse<GuideResponse>> getCurrentGuideProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(guideService.getGuideByUserId(principal.getId())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@ownershipService.isAssignedGuide(authentication, #id) or hasRole('ADMIN')")
    @Operation(summary = "Update guide profile")
    public ResponseEntity<ApiResponse<GuideResponse>> updateGuideProfile(
            @PathVariable UUID id,
            @Valid @RequestBody GuideProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(guideService.updateGuideProfile(id, request)));
    }
}
