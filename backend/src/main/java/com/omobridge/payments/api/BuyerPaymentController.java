package com.omobridge.payments.api;

import com.omobridge.common.exception.UnauthorizedException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.response.PageResponse;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.payments.api.dto.CreatePaymentAttemptRequest;
import com.omobridge.payments.api.dto.PaymentAttemptResponse;
import com.omobridge.payments.api.dto.PaymentResponse;
import com.omobridge.payments.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Buyer Payments", description = "Initiate buyer payments, retrieve payment records")
public class BuyerPaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

    private User getActorUser(UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }

    @PostMapping("/attempt")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Start idempotent payment attempt for an order or booking")
    public ResponseEntity<ApiResponse<PaymentAttemptResponse>> createPaymentAttempt(
            @Valid @RequestBody CreatePaymentAttemptRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User payer = getActorUser(principal);
        PaymentAttemptResponse response = paymentService.createPaymentAttempt(request, payer);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get payment record for an order")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentByOrderId(
            @PathVariable UUID orderId, @AuthenticationPrincipal UserPrincipal principal) {
        PaymentResponse response = paymentService.getPaymentByOrderId(orderId, getActorUser(principal).getId());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List the authenticated payer's own payments, newest first")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Own payments"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401", description = "Authentication required")
    })
    public ResponseEntity<ApiResponse<PageResponse<PaymentResponse>>> getMyPayments(
            @ParameterObject @PageableDefault(size = 20, sort = {"createdAt", "id"}, direction = Sort.Direction.DESC)
            Pageable pageable, @AuthenticationPrincipal UserPrincipal principal) {
        var page = paymentService.getMyPayments(getActorUser(principal).getId(), pageable);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(page)));
    }

    @GetMapping("/{paymentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get the authenticated payer's own payment record for a receipt")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Own payment"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401", description = "Authentication required"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "Payment unavailable")
    })
    public ResponseEntity<ApiResponse<PaymentResponse>> getMyPayment(
            @PathVariable UUID paymentId, @AuthenticationPrincipal UserPrincipal principal) {
        var response = paymentService.getMyPayment(paymentId, getActorUser(principal).getId());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

}
