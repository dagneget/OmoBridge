package com.omobridge.orders.api;

import com.omobridge.common.exception.UnauthorizedException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.orders.api.dto.CheckoutRequest;
import com.omobridge.orders.api.dto.CheckoutResponse;
import com.omobridge.orders.api.dto.OrderDetailResponse;
import com.omobridge.orders.api.dto.OrderSummaryResponse;
import com.omobridge.orders.domain.OrderStatus;
import com.omobridge.orders.service.CheckoutService;
import com.omobridge.orders.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
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

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Buyer Orders & Checkout", description = "Buyer cart checkout, order tracking, and cancellation")
public class BuyerOrderController {

    private final CheckoutService checkoutService;
    private final OrderService orderService;
    private final UserRepository userRepository;

    private User getActorUser(UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }

    @PostMapping("/checkout")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Checkout cart items across one or multiple enterprises with all-or-nothing stock reservation")
    public ResponseEntity<ApiResponse<CheckoutResponse>> checkout(
            @Valid @RequestBody CheckoutRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User buyer = getActorUser(principal);
        CheckoutResponse response = checkoutService.checkout(request, buyer);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping("/orders")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all orders placed by the current buyer")
    public ResponseEntity<ApiResponse<List<OrderSummaryResponse>>> getMyOrders(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User buyer = getActorUser(principal);
        List<OrderSummaryResponse> orders = orderService.getOrdersForBuyer(buyer.getId());
        return ResponseEntity.ok(ApiResponse.ok(orders));
    }

    @GetMapping("/orders/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get detailed order view for buyer")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> getMyOrderDetails(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User buyer = getActorUser(principal);
        OrderDetailResponse order = orderService.getOrderDetailForBuyer(id, buyer.getId());
        return ResponseEntity.ok(ApiResponse.ok(order));
    }

    @PostMapping("/orders/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cancel an order and release reserved stock")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> cancelOrder(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User buyer = getActorUser(principal);
        // Verify buyer owns this order
        orderService.getOrderDetailForBuyer(id, buyer.getId());
        OrderDetailResponse updated = orderService.updateOrderStatus(id, OrderStatus.CANCELLED, "Cancelled by buyer", buyer);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }
}
