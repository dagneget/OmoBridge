package com.omobridge.products.domain;

import com.omobridge.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "product_price_breakdowns")
public class ProductPriceBreakdown extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false, unique = true)
    private Product product;

    @Column(name = "purchase_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal purchaseCost = BigDecimal.ZERO;

    @Column(name = "processing_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal processingCost = BigDecimal.ZERO;

    @Column(name = "packaging_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal packagingCost = BigDecimal.ZERO;

    @Column(name = "labor_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal laborCost = BigDecimal.ZERO;

    @Column(name = "transport_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal transportCost = BigDecimal.ZERO;

    @Column(name = "enterprise_margin", nullable = false, precision = 12, scale = 2)
    private BigDecimal enterpriseMargin = BigDecimal.ZERO;

    @Column(name = "community_fund", nullable = false, precision = 12, scale = 2)
    private BigDecimal communityFund = BigDecimal.ZERO;

    @Column(name = "tax_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "platform_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal platformFee = BigDecimal.ZERO;

    @Column(name = "total_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalPrice = BigDecimal.ZERO;
}
