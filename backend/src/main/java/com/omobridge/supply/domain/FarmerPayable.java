package com.omobridge.supply.domain;

import com.omobridge.common.domain.BaseEntity;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.Farmer;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
@Table(name = "farmer_payables")
public class FarmerPayable extends BaseEntity {

    @Column(name = "payable_no", nullable = false, unique = true, length = 30)
    private String payableNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id", nullable = false)
    private Farmer farmer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enterprise_id", nullable = false)
    private Enterprise enterprise;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_item_id", nullable = false)
    private SupplyDeliveryItem deliveryItem;

    @Column(name = "amount_due", nullable = false, precision = 14, scale = 2)
    private BigDecimal amountDue;

    @Column(name = "amount_allocated", nullable = false, precision = 14, scale = 2)
    private BigDecimal amountAllocated = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private PayableStatus status = PayableStatus.OPEN;
}
