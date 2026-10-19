package com.omobridge.products.api;

import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.products.api.dto.ProductCreateFromOutputRequest;
import com.omobridge.products.api.dto.ProductResponse;
import com.omobridge.products.api.dto.ProductStockAdjustmentRequest;
import com.omobridge.products.api.dto.ProductStockMovementResponse;
import com.omobridge.products.api.dto.ProductUpdateRequest;
import com.omobridge.products.service.ProductService;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/enterprises/{enterpriseId}/products")
@RequiredArgsConstructor
@Tag(name = "Enterprise Products", description = "Enterprise product catalog management, transparent pricing, and stock control")
public class EnterpriseProductController {

    private final ProductService productService;
    private final OwnershipService ownershipService;
    private final UserRepository userRepository;

    private void checkEnterpriseAccess(Authentication authentication, UUID enterpriseId) {
        if (!ownershipService.isEnterpriseMember(authentication, enterpriseId) &&
                !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new ForbiddenException("Access denied to enterprise products");
        }
    }

    private User getActorUser(UserPrincipal principal) {
        return principal != null ? userRepository.findById(principal.getId()).orElse(null) : null;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create product from production batch output with automated transparent pricing")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @PathVariable UUID enterpriseId,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication,
            @Valid @RequestBody ProductCreateFromOutputRequest request
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        ProductResponse response = productService.createProductFromOutput(enterpriseId, request, getActorUser(principal));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all enterprise products (published and unpublished)")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getProducts(
            @PathVariable UUID enterpriseId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(productService.getEnterpriseProducts(enterpriseId)));
    }

    @GetMapping("/{productId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get single product by ID for enterprise")
    public ResponseEntity<ApiResponse<ProductResponse>> getProduct(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID productId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(productService.getProductById(productId, enterpriseId)));
    }

    @PatchMapping("/{productId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update product details")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID productId,
            Authentication authentication,
            @RequestBody ProductUpdateRequest request
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(productService.updateProduct(productId, enterpriseId, request)));
    }

    @PatchMapping("/{productId}/publish")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Publish or unpublish product in public catalog")
    public ResponseEntity<ApiResponse<ProductResponse>> publishProduct(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID productId,
            @RequestParam boolean publish,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(productService.publishProduct(productId, enterpriseId, publish)));
    }

    @PostMapping("/{productId}/adjust-stock")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Adjust physical stock on hand with audit trail")
    public ResponseEntity<ApiResponse<ProductStockMovementResponse>> adjustStock(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID productId,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication,
            @Valid @RequestBody ProductStockAdjustmentRequest request
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        ProductStockMovementResponse response = productService.adjustStock(productId, enterpriseId, request, getActorUser(principal));
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{productId}/stock-movements")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get stock movement history for product")
    public ResponseEntity<ApiResponse<List<ProductStockMovementResponse>>> getStockMovements(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID productId,
            Authentication authentication
    ) {
        checkEnterpriseAccess(authentication, enterpriseId);
        return ResponseEntity.ok(ApiResponse.ok(productService.getStockMovements(productId, enterpriseId)));
    }
}
