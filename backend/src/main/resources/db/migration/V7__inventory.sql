-- V7__inventory.sql
-- Inventory locations, raw material and finished goods lots, and append-only movements

-- 1. Inventory Locations
CREATE TABLE inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    location_type VARCHAR(50) NOT NULL, -- WAREHOUSE, PROCESSING_FACILITY, COLD_ROOM, SHELF
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_inventory_locations_enterprise ON inventory_locations(enterprise_id);

-- 2. Inventory Lots
CREATE TABLE inventory_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_code VARCHAR(50) NOT NULL UNIQUE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,
    product_type_id UUID NOT NULL REFERENCES product_types(id) ON DELETE RESTRICT,
    source_delivery_item_id UUID REFERENCES supply_delivery_items(id) ON DELETE RESTRICT,
    grade VARCHAR(20) NOT NULL,
    received_qty NUMERIC(12, 2) NOT NULL CHECK (received_qty >= 0),
    balance_qty NUMERIC(12, 2) NOT NULL CHECK (balance_qty >= 0),
    unit VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEPLETED', 'DISPOSED')),
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_inventory_lots_enterprise ON inventory_lots(enterprise_id, status);
CREATE INDEX idx_inventory_lots_product ON inventory_lots(product_type_id);
CREATE INDEX idx_inventory_lots_location ON inventory_lots(location_id);

-- 3. Inventory Movements
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
    movement_type VARCHAR(50) NOT NULL CHECK (
        movement_type IN ('RECEIPT', 'CONSUMPTION', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'DISPOSAL')
    ),
    quantity NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL CHECK (balance_after >= 0),
    reason TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    created_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_movements_lot ON inventory_movements(lot_id, created_at ASC);
CREATE INDEX idx_inventory_movements_ref ON inventory_movements(reference_type, reference_id);
