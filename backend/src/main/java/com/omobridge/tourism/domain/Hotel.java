package com.omobridge.tourism.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.omobridge.common.domain.BaseEntity;
import com.omobridge.identity.domain.Enterprise;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "hotels")
public class Hotel extends BaseEntity {

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enterprise_id", nullable = false)
    private Enterprise enterprise;

    public UUID getEnterpriseId() {
        return enterprise != null ? enterprise.getId() : null;
    }

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "location_text", nullable = false, length = 255)
    private String locationText;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "price_from", nullable = false, precision = 14, scale = 2)
    private BigDecimal priceFrom;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "ETB";

    @Column(name = "amenities", columnDefinition = "TEXT")
    private String amenities;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
