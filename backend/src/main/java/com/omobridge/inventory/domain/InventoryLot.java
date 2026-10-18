package com.omobridge.inventory.domain;

import com.omobridge.common.domain.BaseEntity;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.supply.domain.ProductType;
import com.omobridge.supply.domain.SupplyDeliveryItem;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "inventory_lots")
public class InventoryLot extends BaseEntity {

    @Column(name = "lot_code", nullable = false, unique = true, length = 50)
    private String lotCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enterprise_id", nullable = false)
    private Enterprise enterprise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", nullable = false)
    private InventoryLocation location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_type_id", nullable = false)
    private ProductType productType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_delivery_item_id")
    private SupplyDeliveryItem sourceDeliveryItem;

    @Column(name = "grade", nullable = false, length = 20)
    private String grade;

    @Column(name = "received_qty", nullable = false, precision = 12, scale = 2)
    private BigDecimal receivedQty;

    @Column(name = "balance_qty", nullable = false, precision = 12, scale = 2)
    private BigDecimal balanceQty;

    @Column(name = "unit", nullable = false, length = 30)
    private String unit;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private LotStatus status = LotStatus.ACTIVE;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;
}
