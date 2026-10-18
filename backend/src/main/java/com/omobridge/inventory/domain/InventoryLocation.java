package com.omobridge.inventory.domain;

import com.omobridge.common.domain.BaseEntity;
import com.omobridge.identity.domain.Enterprise;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "inventory_locations")
public class InventoryLocation extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enterprise_id", nullable = false)
    private Enterprise enterprise;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "location_type", nullable = false, length = 50)
    private String locationType; // WAREHOUSE, PROCESSING_FACILITY, COLD_ROOM, SHELF

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}
