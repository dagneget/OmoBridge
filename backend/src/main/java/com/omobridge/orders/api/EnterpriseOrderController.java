package com.omobridge.orders.api;

import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.UnauthorizedException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.orders.api.dto.OrderDetailResponse;
import com.omobridge.orders.api.dto.OrderSummaryResponse;
import com.omobridge.orders.api.dto.UpdateOrderStatusRequest;
import com.omobridge.orders.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/enterprises/{enterpriseId}/orders")
@RequiredArgsConstructor
@Tag(name = "Enterprise Orders", description = "Enterprise order fulfillment, packing, and status updates")
public class EnterpriseOrderController {

    private final OrderService orderService;
    private final OwnershipService ownershipService;
    private final UserRepository userRepository;

    private void checkEnterpriseAccess(Authentication authentication, UUID enterpriseId) {
        if (!ownershipService.isEnterpriseMember(authentication, enterpriseId) &&
                authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new ForbiddenException("Access denied to enterprise orders");
        }
    }

    private User getActorUser(UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all orders received by this enterprise")
    public ResponseEntity<ApiResponse<List<OrderSummaryResponse>>> getEnterpriseOrders(
            @PathVariable UUID enterpriseId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        List<OrderSummaryResponse> orders = orderService.getOrdersForEnterprise(enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(orders));
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get detailed order view for enterprise fulfillment")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> getEnterpriseOrderDetails(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID orderId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        OrderDetailResponse order = orderService.getOrderDetailForEnterprise(orderId, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(order));
    }

    @PatchMapping("/{orderId}/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update order status (e.g., PACKED, CANCELLED)")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> updateOrderStatus(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID orderId,
            @Valid @RequestBody UpdateOrderStatusRequest request,
            Authentication authentication,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        User actor = getActorUser(principal);
        // Ensure order belongs to this enterprise
        orderService.getOrderDetailForEnterprise(orderId, enterpriseId);
        OrderDetailResponse updated = orderService.updateOrderStatus(orderId, request.newStatus(), request.reason(), actor);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }
}
