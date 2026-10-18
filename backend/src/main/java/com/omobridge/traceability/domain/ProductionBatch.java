package com.omobridge.traceability.domain;

import com.omobridge.common.domain.BaseEntity;
import com.omobridge.identity.domain.Enterprise;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "production_batches")
public class ProductionBatch extends BaseEntity {

    @Column(name = "batch_code", nullable = false, unique = true, length = 50)
    private String batchCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enterprise_id", nullable = false)
    private Enterprise enterprise;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private BatchStatus status = BatchStatus.DRAFT;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "labor_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal laborCost = BigDecimal.ZERO;

    @Column(name = "processing_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal processingCost = BigDecimal.ZERO;

    @Column(name = "packaging_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal packagingCost = BigDecimal.ZERO;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "batch", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.Set<ProductionInput> inputs = new java.util.LinkedHashSet<>();

    @OneToMany(mappedBy = "batch", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.Set<ProductionOutput> outputs = new java.util.LinkedHashSet<>();

    @OneToMany(mappedBy = "batch", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.Set<ProductionLoss> losses = new java.util.LinkedHashSet<>();

    @OneToOne(mappedBy = "batch", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private TraceRecord traceRecord;

    public void addInput(ProductionInput input) {
        inputs.add(input);
        input.setBatch(this);
    }

    public void addOutput(ProductionOutput output) {
        outputs.add(output);
        output.setBatch(this);
    }

    public void addLoss(ProductionLoss loss) {
        losses.add(loss);
        loss.setBatch(this);
    }
}
