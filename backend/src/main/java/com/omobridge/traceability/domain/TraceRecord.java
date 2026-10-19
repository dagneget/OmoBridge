package com.omobridge.traceability.domain;

import com.omobridge.common.domain.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
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
@Table(name = "trace_records")
public class TraceRecord extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false, unique = true)
    private ProductionBatch batch;

    @Column(name = "public_token", nullable = false, unique = true, length = 64)
    private String publicToken;

    @Column(name = "origin_village", length = 100)
    private String originVillage;

    @Column(name = "origin_label", length = 150)
    private String originLabel;

    @Column(name = "processing_date", nullable = false)
    private Instant processingDate;

    @Column(name = "public_story", columnDefinition = "TEXT")
    private String publicStory;

    @Column(name = "show_farmer_names", nullable = false)
    private boolean showFarmerNames = false;

    @OneToMany(mappedBy = "traceRecord", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.Set<TraceScan> scans = new java.util.LinkedHashSet<>();
}
