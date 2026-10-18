package com.omobridge.traceability.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.traceability.api.dto.PublicTraceResponse;
import com.omobridge.traceability.service.TraceabilityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trace")
@RequiredArgsConstructor
@Tag(name = "Public Traceability", description = "Public transparency endpoints for product origins, stories, and QR scans")
public class PublicTraceController {

    private final TraceabilityService traceabilityService;

    @GetMapping("/{publicToken}")
    @Operation(summary = "Get verified public origin and processing story for a batch token")
    public ResponseEntity<ApiResponse<PublicTraceResponse>> getPublicTrace(
            @PathVariable String publicToken,
            HttpServletRequest request
    ) {
        String ipAddress = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");
        PublicTraceResponse response = traceabilityService.getPublicTrace(publicToken, ipAddress, userAgent);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping(value = "/{publicToken}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    @Operation(summary = "Generate QR code image linking to public trace verification page")
    public ResponseEntity<byte[]> getQrCode(
            @PathVariable String publicToken,
            @RequestParam(defaultValue = "300") int width,
            @RequestParam(defaultValue = "300") int height
    ) {
        byte[] qrImageBytes = traceabilityService.generateQrCodeImage(publicToken, width, height);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        headers.setCacheControl("public, max-age=86400");
        return new ResponseEntity<>(qrImageBytes, headers, HttpStatus.OK);
    }
}
