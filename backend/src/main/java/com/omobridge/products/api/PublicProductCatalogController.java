package com.omobridge.products.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.products.api.dto.ProductResponse;
import com.omobridge.products.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/products")
@RequiredArgsConstructor
@Tag(name = "Public Product Catalog", description = "Public marketplace catalog with transparent pricing and origins")
public class PublicProductCatalogController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "Browse published products with optional category filter or keyword search")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getCatalog(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search
    ) {
        List<ProductResponse> products = productService.getPublicCatalog(category, search);
        return ResponseEntity.ok(ApiResponse.ok(products));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get published product details with transparent price breakdown, story, and trace link")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductDetail(@PathVariable UUID id) {
        ProductResponse product = productService.getPublicProductDetail(id);
        return ResponseEntity.ok(ApiResponse.ok(product));
    }
}
