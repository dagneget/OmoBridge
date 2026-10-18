package com.omobridge.tourism.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.tourism.api.dto.HotelRequest;
import com.omobridge.tourism.domain.Hotel;
import com.omobridge.tourism.service.HotelService;
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
@Tag(name = "Hotels & Accommodations", description = "Endpoints for discovering and managing lodging")
public class HotelController {

    private final HotelService hotelService;

    @GetMapping("/tourism/hotels")
    @Operation(summary = "Publicly browse active hotels and resorts")
    public ResponseEntity<ApiResponse<List<Hotel>>> getPublicHotels() {
        return ResponseEntity.ok(ApiResponse.ok(hotelService.getPublicHotels()));
    }

    @GetMapping("/tourism/hotels/{id}")
    @Operation(summary = "Get hotel details")
    public ResponseEntity<ApiResponse<Hotel>> getHotelById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(hotelService.getHotelById(id)));
    }

    @GetMapping("/enterprises/{enterpriseId}/tourism/hotels")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "List hotels owned by an enterprise")
    public ResponseEntity<ApiResponse<List<Hotel>>> getEnterpriseHotels(
            @PathVariable UUID enterpriseId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.ok(hotelService.getEnterpriseHotels(authentication, enterpriseId)));
    }

    @PostMapping("/enterprises/{enterpriseId}/tourism/hotels")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Create hotel listing for an enterprise")
    public ResponseEntity<ApiResponse<Hotel>> createHotel(
            @PathVariable UUID enterpriseId,
            @Valid @RequestBody HotelRequest request,
            Authentication authentication
    ) {
        Hotel hotel = hotelService.createHotel(authentication, enterpriseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Hotel created successfully", hotel));
    }

    @PutMapping("/enterprises/{enterpriseId}/tourism/hotels/{id}")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Update hotel listing")
    public ResponseEntity<ApiResponse<Hotel>> updateHotel(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID id,
            @Valid @RequestBody HotelRequest request,
            Authentication authentication
    ) {
        Hotel hotel = hotelService.updateHotel(authentication, id, request);
        return ResponseEntity.ok(ApiResponse.ok("Hotel updated successfully", hotel));
    }

    @DeleteMapping("/enterprises/{enterpriseId}/tourism/hotels/{id}")
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'SYSTEM_ADMIN')")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Delete hotel listing")
    public ResponseEntity<ApiResponse<Void>> deleteHotel(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID id,
            Authentication authentication
    ) {
        hotelService.deleteHotel(authentication, id);
        return ResponseEntity.ok(ApiResponse.ok("Hotel deleted successfully", null));
    }
}
