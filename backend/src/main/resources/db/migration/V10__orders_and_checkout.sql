-- V10__orders_and_checkout.sql
-- Orders, multi-enterprise checkout groups, order items with snapshotting, status history, and stock reservations

-- 1. Checkout Groups
CREATE TABLE checkout_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_no VARCHAR(64) NOT NULL UNIQUE,
    buyer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL CHECK (status IN ('CREATED', 'PAID', 'PARTIALLY_PAID', 'CANCELLED')),
    total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    idempotency_key VARCHAR(128) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_checkout_groups_buyer ON checkout_groups(buyer_user_id, created_at DESC);

-- 2. Orders (enterprise-specific fulfillment & financials)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(64) NOT NULL UNIQUE,
    checkout_group_id UUID NOT NULL REFERENCES checkout_groups(id) ON DELETE RESTRICT,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE RESTRICT,
    buyer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL CHECK (
        status IN ('PLACED', 'PAID', 'PACKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')
    ),
    subtotal NUMERIC(15, 2) NOT NULL CHECK (subtotal >= 0),
    tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (tax >= 0),
    platform_fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (platform_fee >= 0),
    delivery_fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
    total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    delivery_address TEXT NOT NULL,
    delivery_phone VARCHAR(32) NOT NULL,
    delivery_latitude DOUBLE PRECISION,
    delivery_longitude DOUBLE PRECISION,
    notes TEXT,
    idempotency_key VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_orders_checkout_group ON orders(checkout_group_id);
CREATE INDEX idx_orders_enterprise ON orders(enterprise_id, status);
CREATE INDEX idx_orders_buyer ON orders(buyer_user_id, status);

-- 3. Order Items (Snapshot of product data at purchase time)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES production_batches(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    product_sku_snapshot VARCHAR(64) NOT NULL,
    unit_price_snapshot NUMERIC(15, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(15, 2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- 4. Order Status History
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status VARCHAR(32),
    to_status VARCHAR(32) NOT NULL,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_status_history_order ON order_status_history(order_id, created_at ASC);

-- 5. Stock Reservations
CREATE TABLE stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    status VARCHAR(32) NOT NULL CHECK (status IN ('HELD', 'COMMITTED', 'RELEASED', 'EXPIRED')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_stock_reservations_product ON stock_reservations(product_id, status);
CREATE INDEX idx_stock_reservations_expiry ON stock_reservations(status, expires_at);
CREATE INDEX idx_stock_reservations_order ON stock_reservations(order_id);
