-- V6__supply_and_farmer_payments.sql
-- Supply deliveries, raw material buying prices, quality grading, payables and payments

-- 1. Product Types
CREATE TABLE product_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_product_types_category ON product_types(category);

-- 2. Buying Prices
CREATE TABLE buying_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE RESTRICT,
    product_type_id UUID NOT NULL REFERENCES product_types(id) ON DELETE RESTRICT,
    grade VARCHAR(20) NOT NULL,
    price_per_unit NUMERIC(14, 2) NOT NULL CHECK (price_per_unit >= 0),
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_enterprise_product_grade_effective UNIQUE (enterprise_id, product_type_id, grade, effective_from)
);

CREATE INDEX idx_buying_prices_lookup ON buying_prices(enterprise_id, product_type_id, grade, is_active);

-- 3. Supply Deliveries
CREATE TABLE supply_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_no VARCHAR(30) NOT NULL UNIQUE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE RESTRICT,
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
    delivered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    received_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'RECORDED' CHECK (status IN ('RECORDED', 'INSPECTED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_supply_deliveries_farmer ON supply_deliveries(farmer_id, delivered_at DESC);
CREATE INDEX idx_supply_deliveries_enterprise ON supply_deliveries(enterprise_id, delivered_at DESC);
CREATE INDEX idx_supply_deliveries_status ON supply_deliveries(status);

-- 4. Supply Delivery Items
CREATE TABLE supply_delivery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES supply_deliveries(id) ON DELETE CASCADE,
    product_type_id UUID NOT NULL REFERENCES product_types(id) ON DELETE RESTRICT,
    grade VARCHAR(20) NOT NULL,
    delivered_qty NUMERIC(12, 2) NOT NULL CHECK (delivered_qty >= 0),
    accepted_qty NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (accepted_qty >= 0),
    rejected_qty NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (rejected_qty >= 0),
    rejection_reason TEXT,
    unit_price_snapshot NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (unit_price_snapshot >= 0),
    line_total NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_supply_qty_sum CHECK (
        (delivered_qty = accepted_qty + rejected_qty) OR (accepted_qty = 0 AND rejected_qty = 0)
    )
);

CREATE INDEX idx_supply_delivery_items_delivery ON supply_delivery_items(delivery_id);
CREATE INDEX idx_supply_delivery_items_product ON supply_delivery_items(product_type_id);

-- 5. Farmer Payables
CREATE TABLE farmer_payables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_no VARCHAR(30) NOT NULL UNIQUE,
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE RESTRICT,
    delivery_item_id UUID NOT NULL REFERENCES supply_delivery_items(id) ON DELETE RESTRICT,
    amount_due NUMERIC(14, 2) NOT NULL CHECK (amount_due >= 0),
    amount_allocated NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount_allocated >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIAL', 'SETTLED', 'VOID')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_farmer_payable_allocated CHECK (amount_allocated <= amount_due)
);

CREATE INDEX idx_farmer_payables_farmer ON farmer_payables(farmer_id, status);
CREATE INDEX idx_farmer_payables_enterprise ON farmer_payables(enterprise_id, status);

-- 6. Farmer Payments
CREATE TABLE farmer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_no VARCHAR(30) NOT NULL UNIQUE,
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE RESTRICT,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'SUCCESS', 'FAILED')),
    gateway_reference VARCHAR(100),
    idempotency_key VARCHAR(100) UNIQUE,
    failure_reason TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_farmer_payments_farmer ON farmer_payments(farmer_id, status);
CREATE INDEX idx_farmer_payments_enterprise ON farmer_payments(enterprise_id);

-- 7. Payment Allocations
CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES farmer_payments(id) ON DELETE RESTRICT,
    payable_id UUID NOT NULL REFERENCES farmer_payables(id) ON DELETE RESTRICT,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    allocated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_payable ON payment_allocations(payable_id);
