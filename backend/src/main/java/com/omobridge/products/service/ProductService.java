package com.omobridge.products.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ConflictException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.User;
import com.omobridge.products.api.dto.ProductCreateFromOutputRequest;
import com.omobridge.products.api.dto.ProductResponse;
import com.omobridge.products.api.dto.ProductStockAdjustmentRequest;
import com.omobridge.products.api.dto.ProductStockMovementResponse;
import com.omobridge.products.api.dto.ProductUpdateRequest;
import com.omobridge.products.domain.Product;
import com.omobridge.products.domain.ProductPriceBreakdown;
import com.omobridge.products.domain.ProductRepository;
import com.omobridge.products.domain.ProductStockMovement;
import com.omobridge.products.domain.ProductStockMovementRepository;
import com.omobridge.products.domain.ProductStockMovementType;
import com.omobridge.traceability.domain.ProductionOutput;
import com.omobridge.traceability.domain.ProductionOutputRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductStockMovementRepository stockMovementRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final ProductionOutputRepository outputRepository;
    private final ProductPricingService pricingService;
    private final AuditService auditService;

    @Transactional
    public ProductResponse createProductFromOutput(
            UUID enterpriseId,
            ProductCreateFromOutputRequest request,
            User actor
    ) {
        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with id: " + enterpriseId));

        if (productRepository.findByEnterpriseIdAndSku(enterpriseId, request.sku()).isPresent()) {
            throw new ConflictException("SKU already exists for enterprise: " + request.sku());
        }

        ProductionOutput output = outputRepository.findById(request.productionOutputId())
                .orElseThrow(() -> new ResourceNotFoundException("Production output not found: " + request.productionOutputId()));

        if (!output.getBatch().getEnterprise().getId().equals(enterpriseId)) {
            throw new BusinessRuleException("Production output belongs to another enterprise");
        }

        // B-703: Initial stock cannot exceed production output quantity
        if (request.initialStock().compareTo(output.getQuantity()) > 0) {
            throw new BusinessRuleException("STOCK_EXCEEDS_OUTPUT: Initial stock (" + request.initialStock() +
                    ") cannot exceed output batch quantity (" + output.getQuantity() + ")");
        }

        Product product = new Product();
        product.setEnterprise(enterprise);
        product.setSku(request.sku().toUpperCase());
        product.setName(request.name());
        product.setDescription(request.description());
        product.setStory(request.story());
        product.setCategory(request.category());
        product.setUnit(output.getUnit());
        product.setPackSize(request.packSize());
        product.setProductionOutput(output);
        product.setStockOnHand(request.initialStock());
        product.setStockReserved(BigDecimal.ZERO);
        product.setPublished(request.publishImmediately());

        Product savedProduct = productRepository.save(product);

        // Record INITIAL_STOCK movement
        ProductStockMovement movement = new ProductStockMovement();
        movement.setProduct(savedProduct);
        movement.setMovementType(ProductStockMovementType.INITIAL_STOCK);
        movement.setQuantity(request.initialStock());
        movement.setStockAfter(request.initialStock());
        movement.setReason("Initial stock creation from production output " + output.getId());
        movement.setReferenceType("PRODUCTION_OUTPUT");
        movement.setReferenceId(output.getId());
        movement.setCreatedByUser(actor);
        movement.setCreatedAt(Instant.now());
        stockMovementRepository.save(movement);

        // Calculate transparent price breakdown
        ProductPriceBreakdown breakdown = pricingService.calculateAndSaveBreakdown(
                savedProduct,
                output,
                request.transportCost(),
                request.marginRate()
        );

        savedProduct.setPriceBreakdown(breakdown);
        Product finalProduct = productRepository.save(savedProduct);

        auditService.recordInCurrentTransaction(
                "CREATE_PRODUCT",
                "PRODUCT",
                finalProduct.getId(),
                Map.of("sku", finalProduct.getSku(), "unitPrice", finalProduct.getUnitPrice().toPlainString())
        );

        return ProductResponse.fromEntity(finalProduct);
    }

    @Transactional
    public ProductStockMovementResponse adjustStock(
            UUID productId,
            UUID enterpriseId,
            ProductStockAdjustmentRequest request,
            User actor
    ) {
        Product product = productRepository.findByIdWithLock(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        if (!product.getEnterprise().getId().equals(enterpriseId)) {
            throw new BusinessRuleException("Cannot adjust product belonging to another enterprise");
        }

        BigDecimal newStock = product.getStockOnHand().add(request.quantity());

        if (newStock.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessRuleException("NEGATIVE_STOCK: Stock cannot be negative. Current: " +
                    product.getStockOnHand() + ", adjustment: " + request.quantity());
        }

        if (newStock.compareTo(product.getStockReserved()) < 0) {
            throw new BusinessRuleException("STOCK_BELOW_RESERVED: Stock on hand (" + newStock +
                    ") cannot be less than currently reserved stock (" + product.getStockReserved() + ")");
        }

        product.setStockOnHand(newStock);
        productRepository.save(product);

        ProductStockMovement movement = new ProductStockMovement();
        movement.setProduct(product);
        movement.setMovementType(ProductStockMovementType.ADJUSTMENT);
        movement.setQuantity(request.quantity());
        movement.setStockAfter(newStock);
        movement.setReason(request.reason());
        movement.setCreatedByUser(actor);
        movement.setCreatedAt(Instant.now());
        ProductStockMovement saved = stockMovementRepository.save(movement);

        auditService.recordInCurrentTransaction(
                "ADJUST_PRODUCT_STOCK",
                "PRODUCT",
                product.getId(),
                Map.of("sku", product.getSku(), "adjustment", request.quantity().toPlainString(), "newStock", newStock.toPlainString())
        );

        return ProductStockMovementResponse.fromEntity(saved);
    }

    @Transactional
    public ProductResponse publishProduct(UUID productId, UUID enterpriseId, boolean publish) {
        Product product = productRepository.findByIdAndEnterpriseId(productId, enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));

        product.setPublished(publish);
        Product saved = productRepository.save(product);

        auditService.recordInCurrentTransaction(
                "PUBLISH_PRODUCT",
                "PRODUCT",
                saved.getId(),
                Map.of("sku", saved.getSku(), "published", String.valueOf(publish))
        );

        return ProductResponse.fromEntity(saved);
    }

    @Transactional
    public ProductResponse updateProduct(UUID productId, UUID enterpriseId, ProductUpdateRequest request) {
        Product product = productRepository.findByIdAndEnterpriseId(productId, enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));

        if (request.name() != null) product.setName(request.name());
        if (request.description() != null) product.setDescription(request.description());
        if (request.story() != null) product.setStory(request.story());
        if (request.unitPrice() != null) product.setUnitPrice(request.unitPrice());
        if (request.published() != null) product.setPublished(request.published());

        Product saved = productRepository.save(product);
        return ProductResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getEnterpriseProducts(UUID enterpriseId) {
        return productRepository.findByEnterpriseId(enterpriseId).stream()
                .map(ProductResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductById(UUID productId, UUID enterpriseId) {
        Product product = productRepository.findByIdAndEnterpriseId(productId, enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));
        return ProductResponse.fromEntity(product);
    }

    @Transactional(readOnly = true)
    public List<ProductStockMovementResponse> getStockMovements(UUID productId, UUID enterpriseId) {
        Product product = productRepository.findByIdAndEnterpriseId(productId, enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));
        return stockMovementRepository.findByProductIdOrderByCreatedAtAsc(product.getId()).stream()
                .map(ProductStockMovementResponse::fromEntity)
                .toList();
    }

    // B-704: Public Catalog
    @Transactional(readOnly = true)
    public List<ProductResponse> getPublicCatalog(String category, String search) {
        List<Product> products;
        if (search != null && !search.isBlank()) {
            products = productRepository.searchPublished(search);
        } else if (category != null && !category.isBlank()) {
            products = productRepository.findByPublishedTrueAndCategoryIgnoreCase(category);
        } else {
            products = productRepository.findByPublishedTrue();
        }
        return products.stream().map(ProductResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse getPublicProductDetail(UUID id) {
        Product product = productRepository.findPublishedDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Published product not found with id: " + id));
        return ProductResponse.fromEntity(product);
    }
}
