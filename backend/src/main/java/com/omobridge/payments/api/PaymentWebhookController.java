package com.omobridge.payments.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.payments.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/integrations/payments")
@RequiredArgsConstructor
@Tag(name = "Payment Webhooks", description = "Verified external payment provider webhook ingestion")
public class PaymentWebhookController {

    private final PaymentService paymentService;

    @PostMapping("/{provider}/webhook")
    @Operation(summary = "Ingest verified gateway webhook event (e.g. Telebirr, CBE Birr)")
    public ResponseEntity<ApiResponse<Boolean>> handleProviderWebhook(
            @PathVariable String provider,
            @RequestParam(name = "eventId") String eventId,
            @RequestParam(name = "eventType") String eventType,
            @RequestHeader(name = "X-Signature", required = false) String signature,
            @RequestBody JsonNode payload
    ) {
        boolean processed = paymentService.processVerifiedWebhook(provider, eventId, eventType, signature, payload);
        return ResponseEntity.ok(ApiResponse.ok("Webhook processed successfully", processed));
    }
}
