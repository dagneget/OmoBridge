package com.omobridge.products.domain;

import com.omobridge.common.domain.BaseEntity;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.traceability.domain.ProductionOutput;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "products",
        uniqueConstraints = @UniqueConstraint(name = "uq_enterprise_sku", columnNames = {"enterprise_id", "sku"})
)
public class Product extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enterprise_id", nullable = false)
    private Enterprise enterprise;

    @Column(name = "sku", nullable = false, length = 50)
    private String sku;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "story", columnDefinition = "TEXT")
    private String story;

    @Column(name = "category", nullable = false, length = 100)
    private String category;

    @Column(name = "unit", nullable = false, length = 30)
    private String unit;

    @Column(name = "pack_size", nullable = false, precision = 10, scale = 2)
    private BigDecimal packSize = BigDecimal.ONE;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "ETB";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_output_id")
    private ProductionOutput productionOutput;

    @Column(name = "stock_on_hand", nullable = false, precision = 12, scale = 2)
    private BigDecimal stockOnHand = BigDecimal.ZERO;

    @Column(name = "stock_reserved", nullable = false, precision = 12, scale = 2)
    private BigDecimal stockReserved = BigDecimal.ZERO;

    @Column(name = "is_published", nullable = false)
    private boolean published = false;

    @OneToOne(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private ProductPriceBreakdown priceBreakdown;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
    private Set<ProductStockMovement> stockMovements = new LinkedHashSet<>();

    public BigDecimal getAvailableStock() {
        return stockOnHand.subtract(stockReserved);
    }
}
