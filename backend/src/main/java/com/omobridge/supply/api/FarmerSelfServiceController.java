package com.omobridge.supply.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.supply.api.dto.FarmerBalanceSummaryResponse;
import com.omobridge.supply.api.dto.FarmerPayableResponse;
import com.omobridge.supply.api.dto.FarmerPaymentResponse;
import com.omobridge.supply.api.dto.SupplyDeliveryResponse;
import com.omobridge.supply.service.FarmerSelfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/farmers/{farmerId}")
@RequiredArgsConstructor
@Tag(name = "Farmer Self-Service", description = "Farmer portal deliveries, payables, payments and balance")
public class FarmerSelfServiceController {

    private final FarmerSelfService farmerSelfService;

    @GetMapping("/deliveries")
    @PreAuthorize("@ownershipService.isOwnFarmer(authentication, #farmerId) or @ownershipService.isEnterpriseManagingFarmer(authentication, #farmerId) or hasRole('ADMIN')")
    @Operation(summary = "Get farmer's own deliveries")
    public ResponseEntity<ApiResponse<List<SupplyDeliveryResponse>>> getDeliveries(
            @PathVariable UUID farmerId) {
        return ResponseEntity.ok(ApiResponse.ok(farmerSelfService.getFarmerDeliveries(farmerId)));
    }

    @GetMapping("/payables")
    @PreAuthorize("@ownershipService.isOwnFarmer(authentication, #farmerId) or @ownershipService.isEnterpriseManagingFarmer(authentication, #farmerId) or hasRole('ADMIN')")
    @Operation(summary = "Get farmer's own payables")
    public ResponseEntity<ApiResponse<List<FarmerPayableResponse>>> getPayables(
            @PathVariable UUID farmerId) {
        return ResponseEntity.ok(ApiResponse.ok(farmerSelfService.getFarmerPayables(farmerId)));
    }

    @GetMapping("/payments")
    @PreAuthorize("@ownershipService.isOwnFarmer(authentication, #farmerId) or @ownershipService.isEnterpriseManagingFarmer(authentication, #farmerId) or hasRole('ADMIN')")
    @Operation(summary = "Get farmer's received payments and allocations")
    public ResponseEntity<ApiResponse<List<FarmerPaymentResponse>>> getPayments(
            @PathVariable UUID farmerId) {
        return ResponseEntity.ok(ApiResponse.ok(farmerSelfService.getFarmerPayments(farmerId)));
    }

    @GetMapping("/balance")
    @PreAuthorize("@ownershipService.isOwnFarmer(authentication, #farmerId) or @ownershipService.isEnterpriseManagingFarmer(authentication, #farmerId) or hasRole('ADMIN')")
    @Operation(summary = "Get farmer's balance summary (delivered, settled, pending payout)")
    public ResponseEntity<ApiResponse<FarmerBalanceSummaryResponse>> getBalance(
            @PathVariable UUID farmerId) {
        return ResponseEntity.ok(ApiResponse.ok(farmerSelfService.getFarmerBalanceSummary(farmerId)));
    }
}
