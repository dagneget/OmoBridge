package com.omobridge.integrations.ussd;

import com.omobridge.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/integrations/ussd")
@RequiredArgsConstructor
@Tag(name = "USSD Integration", description = "Telecom USSD gateway callback for offline feature phone farmers")
public class UssdController {

    private final UssdService ussdService;

    @PostMapping
    @Operation(summary = "Handle USSD gateway callback session interaction")
    public ResponseEntity<ApiResponse<UssdResponse>> handleUssd(@Valid @RequestBody UssdRequest request) {
        UssdResponse response = ussdService.handleUssdRequest(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
