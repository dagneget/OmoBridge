package com.omobridge.integrations.sms;

import com.omobridge.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/integrations/sms")
@RequiredArgsConstructor
@Tag(name = "SMS Integration", description = "Inbound SMS webhook and delivery checkpoint processing")
public class InboundSmsController {

    private final InboundSmsService inboundSmsService;

    @PostMapping("/inbound")
    @Operation(summary = "Process inbound SMS webhook from telecom provider")
    public ResponseEntity<ApiResponse<InboundSmsResponse>> handleInbound(
            @Valid @RequestBody InboundSmsRequest request,
            @RequestHeader(value = "X-SMS-Signature", required = false) String signature
    ) {
        InboundSmsResponse response = inboundSmsService.handleInboundSms(request, signature);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
