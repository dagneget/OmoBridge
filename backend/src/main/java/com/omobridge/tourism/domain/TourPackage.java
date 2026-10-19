package com.omobridge.tourism.domain;

import com.omobridge.common.domain.BaseEntity;
import com.omobridge.identity.domain.Enterprise;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "tour_packages")
public class TourPackage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enterprise_id", nullable = false)
    private Enterprise enterprise;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "category", nullable = false, length = 100)
    private String category;

    @Column(name = "overview", nullable = false, columnDefinition = "TEXT")
    private String overview;

    @Column(name = "story", columnDefinition = "TEXT")
    private String story;

    @Column(name = "location_text", nullable = false, length = 255)
    private String locationText;

    @Column(name = "latitude", precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "directions", columnDefinition = "TEXT")
    private String directions;

    @Column(name = "opening_hours", length = 100)
    private String openingHours;

    @Column(name = "duration_hours", precision = 6, scale = 2)
    private BigDecimal durationHours;

    @Column(name = "max_group_size", nullable = false)
    private int maxGroupSize = 10;

    @Column(name = "price_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal priceAmount;

    @Column(name = "price_unit", nullable = false, length = 50)
    private String priceUnit = "PER_PERSON";

    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "ETB";

    @Column(name = "cultural_rules", columnDefinition = "TEXT")
    private String culturalRules;

    @Column(name = "safety_notes", columnDefinition = "TEXT")
    private String safetyNotes;

    @Column(name = "community_approval_ref", length = 100)
    private String communityApprovalRef;

    @Column(name = "community_approval_date")
    private LocalDate communityApprovalDate;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
