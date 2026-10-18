package com.omobridge.supply.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.supply.api.dto.ProductTypeRequest;
import com.omobridge.supply.api.dto.ProductTypeResponse;
import com.omobridge.supply.service.ProductTypeService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/product-types")
@RequiredArgsConstructor
@Tag(name = "Product Types", description = "Raw agricultural material types catalog")
public class ProductTypeController {

    private final ProductTypeService productTypeService;

    @GetMapping
    @Operation(summary = "List raw product types (public & USSD)")
    public ResponseEntity<ApiResponse<List<ProductTypeResponse>>> listProductTypes(
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(ApiResponse.ok(productTypeService.getAllProductTypes(category)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get product type by ID")
    public ResponseEntity<ApiResponse<ProductTypeResponse>> getProductTypeById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(productTypeService.getProductTypeById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MICRO_ENTERPRISE', 'ADMIN')")
    @Operation(summary = "Create product type")
    public ResponseEntity<ApiResponse<ProductTypeResponse>> createProductType(
            @Valid @RequestBody ProductTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(productTypeService.createProductType(request)));
    }
}
