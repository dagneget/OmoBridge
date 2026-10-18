-- V9__catalog_and_product_pricing.sql
-- Products, inventory stock movements, and transparent price breakdowns

-- 1. Products Catalog
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE RESTRICT,
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    story TEXT,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    pack_size NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    production_output_id UUID REFERENCES production_outputs(id) ON DELETE SET NULL,
    stock_on_hand NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (stock_on_hand >= 0),
    stock_reserved NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (stock_reserved >= 0),
    CONSTRAINT chk_stock_reserved CHECK (stock_reserved <= stock_on_hand),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_enterprise_sku UNIQUE (enterprise_id, sku)
);

CREATE INDEX idx_products_enterprise ON products(enterprise_id, is_published);
CREATE INDEX idx_products_category ON products(category, is_published);
CREATE INDEX idx_products_output ON products(production_output_id);

-- 2. Product Stock Movements (Append-only audit trail)
CREATE TABLE product_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    movement_type VARCHAR(50) NOT NULL CHECK (
        movement_type IN ('INITIAL_STOCK', 'SALE', 'RESERVATION_HOLD', 'RESERVATION_RELEASE', 'RESTOCK', 'ADJUSTMENT')
    ),
    quantity NUMERIC(12, 2) NOT NULL,
    stock_after NUMERIC(12, 2) NOT NULL CHECK (stock_after >= 0),
    reason TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    created_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_stock_movements_product ON product_stock_movements(product_id, created_at ASC);

-- 3. Product Price Breakdowns
CREATE TABLE product_price_breakdowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    purchase_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    processing_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    packaging_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    labor_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    transport_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    enterprise_margin NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    community_fund NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_product_price_breakdowns_product ON product_price_breakdowns(product_id);
