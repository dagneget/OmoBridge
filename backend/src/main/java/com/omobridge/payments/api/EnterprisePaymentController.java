package com.omobridge.payments.api;

import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.UnauthorizedException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.payments.api.dto.PaymentReconciliationReport;
import com.omobridge.payments.api.dto.RefundRequest;
import com.omobridge.payments.api.dto.RefundResponse;
import com.omobridge.payments.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/enterprises/{enterpriseId}/payments")
@RequiredArgsConstructor
@Tag(name = "Enterprise Payments & Refunds", description = "Enterprise payment refunds and financial reconciliation")
public class EnterprisePaymentController {

    private final PaymentService paymentService;
    private final OwnershipService ownershipService;
    private final UserRepository userRepository;

    private void checkEnterpriseAccess(Authentication authentication, UUID enterpriseId) {
        if (!ownershipService.isEnterpriseMember(authentication, enterpriseId) &&
                authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new ForbiddenException("Access denied to enterprise payment administration");
        }
    }

    private User getActorUser(UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }

    @PostMapping("/{paymentId}/refund")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Issue full or partial refund bounded by payment total")
    public ResponseEntity<ApiResponse<RefundResponse>> issueRefund(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID paymentId,
            @Valid @RequestBody RefundRequest request,
            Authentication authentication,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        User actor = getActorUser(principal);
        RefundResponse response = paymentService.refundPayment(paymentId, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("Refund processed successfully", response));
    }

    @GetMapping("/reconciliation")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Generate enterprise payment reconciliation report flagging financial discrepancies")
    public ResponseEntity<ApiResponse<PaymentReconciliationReport>> getReconciliationReport(
            @PathVariable UUID enterpriseId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        PaymentReconciliationReport report = paymentService.generateReconciliationReport(enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(report));
    }
}
