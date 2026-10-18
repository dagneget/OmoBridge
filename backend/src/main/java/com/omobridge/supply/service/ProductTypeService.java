package com.omobridge.supply.service;

import com.omobridge.common.exception.ConflictException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.supply.api.dto.ProductTypeRequest;
import com.omobridge.supply.api.dto.ProductTypeResponse;
import com.omobridge.supply.domain.ProductType;
import com.omobridge.supply.domain.ProductTypeRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductTypeService {

    private final ProductTypeRepository productTypeRepository;

    public List<ProductTypeResponse> getAllProductTypes(String category) {
        List<ProductType> list = (category != null && !category.isBlank())
                ? productTypeRepository.findAllByCategory(category)
                : productTypeRepository.findAll();
        return list.stream().map(ProductTypeResponse::fromEntity).toList();
    }

    public ProductTypeResponse getProductTypeById(UUID id) {
        ProductType pt = productTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product type not found with id: " + id));
        return ProductTypeResponse.fromEntity(pt);
    }

    @Transactional
    public ProductTypeResponse createProductType(ProductTypeRequest request) {
        if (productTypeRepository.findByCode(request.code()).isPresent()) {
            throw new ConflictException("Product type already exists with code: " + request.code());
        }

        ProductType saved = productTypeRepository.save(request.toEntity());
        return ProductTypeResponse.fromEntity(saved);
    }
}
