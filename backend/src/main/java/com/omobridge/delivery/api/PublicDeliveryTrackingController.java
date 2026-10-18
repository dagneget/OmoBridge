package com.omobridge.delivery.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.delivery.api.dto.DeliveryTrackingResponse;
import com.omobridge.delivery.service.DeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/delivery/track")
@RequiredArgsConstructor
@Tag(name = "Delivery Tracking", description = "Public live delivery tracking via unique token")
public class PublicDeliveryTrackingController {

    private final DeliveryService deliveryService;

    @GetMapping("/{trackingToken}")
    @Operation(summary = "Track delivery job status and latest coordinates via secure tracking token")
    public ResponseEntity<ApiResponse<DeliveryTrackingResponse>> trackDelivery(@PathVariable String trackingToken) {
        DeliveryTrackingResponse response = deliveryService.getTracking(trackingToken);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
