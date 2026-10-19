package com.omobridge.supply.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.supply.api.dto.BuyingPriceRequest;
import com.omobridge.supply.api.dto.BuyingPriceResponse;
import com.omobridge.supply.service.BuyingPriceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/buying-prices")
@RequiredArgsConstructor
@Tag(name = "Buying Prices", description = "Enterprise buying prices for farmer raw materials")
public class BuyingPriceController {

    private final BuyingPriceService buyingPriceService;

    @GetMapping("/enterprises/{enterpriseId}")
    @Operation(summary = "List active buying prices for an enterprise (public, farmers, USSD)")
    public ResponseEntity<ApiResponse<List<BuyingPriceResponse>>> listBuyingPrices(
            @PathVariable UUID enterpriseId) {
        return ResponseEntity.ok(ApiResponse.ok(buyingPriceService.getActiveBuyingPrices(enterpriseId)));
    }

    @PostMapping
    @PreAuthorize("@ownershipService.isEnterpriseMember(authentication, #request.enterpriseId()) or hasRole('ADMIN')")
    @Operation(summary = "Create buying price for an enterprise product type and grade")
    public ResponseEntity<ApiResponse<BuyingPriceResponse>> createBuyingPrice(
            @Valid @RequestBody BuyingPriceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(buyingPriceService.createBuyingPrice(request)));
    }
}
