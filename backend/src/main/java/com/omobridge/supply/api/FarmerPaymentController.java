package com.omobridge.supply.api;

import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.supply.api.dto.FarmerPaymentRequest;
import com.omobridge.supply.api.dto.FarmerPaymentResponse;
import com.omobridge.supply.service.FarmerPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/farmer-payments")
@RequiredArgsConstructor
@Tag(name = "Farmer Payments", description = "Disbursement and payout allocation to farmers")
public class FarmerPaymentController {

    private final FarmerPaymentService farmerPaymentService;
    private final OwnershipService ownershipService;

    @PostMapping
    @PreAuthorize("@ownershipService.isEnterpriseMember(authentication, #request.enterpriseId()) or hasRole('ADMIN')")
    @Operation(summary = "Disburse payment to farmer with oldest-first payable allocation")
    public ResponseEntity<ApiResponse<FarmerPaymentResponse>> payFarmer(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody FarmerPaymentRequest request) {
        FarmerPaymentResponse response = farmerPaymentService.payFarmer(
                request.enterpriseId(), principal.getId(), request, idempotencyKey
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get farmer payment details by ID")
    public ResponseEntity<ApiResponse<FarmerPaymentResponse>> getPaymentById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication) {
        FarmerPaymentResponse payment = farmerPaymentService.getPaymentById(id);

        boolean isEnterprise = ownershipService.isEnterpriseMember(authentication, payment.enterpriseId());
        boolean isFarmer = ownershipService.isOwnFarmer(authentication, payment.farmerId());
        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isEnterprise && !isFarmer && !isAdmin) {
            throw new ForbiddenException("You do not have access to this payment");
        }

        return ResponseEntity.ok(ApiResponse.ok(payment));
    }

    @GetMapping("/enterprises/{enterpriseId}")
    @PreAuthorize("@ownershipService.isEnterpriseMember(authentication, #enterpriseId) or hasRole('ADMIN')")
    @Operation(summary = "List farmer payments disbursed by enterprise")
    public ResponseEntity<ApiResponse<List<FarmerPaymentResponse>>> getEnterprisePayments(
            @PathVariable UUID enterpriseId) {
        return ResponseEntity.ok(ApiResponse.ok(farmerPaymentService.getEnterprisePayments(enterpriseId)));
    }
}
