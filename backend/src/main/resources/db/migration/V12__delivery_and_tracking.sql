-- V12__delivery_and_tracking.sql
-- Delivery jobs, shared logistics consolidation, offline/live location ingestion, and tracking history

-- 1. Delivery Jobs
CREATE TABLE delivery_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_no VARCHAR(64) NOT NULL UNIQUE,
    provider_id UUID REFERENCES delivery_providers(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL CHECK (
        status IN ('PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED')
    ),
    pickup_address TEXT NOT NULL,
    pickup_latitude DOUBLE PRECISION,
    pickup_longitude DOUBLE PRECISION,
    dropoff_address TEXT NOT NULL,
    dropoff_latitude DOUBLE PRECISION,
    dropoff_longitude DOUBLE PRECISION,
    fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (fee >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    tracking_token VARCHAR(64) NOT NULL UNIQUE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_delivery_jobs_provider ON delivery_jobs(provider_id, status);
CREATE INDEX idx_delivery_jobs_token ON delivery_jobs(tracking_token);

-- 2. Delivery Job Orders (Shared logistics: multi-order consolidation with fee split)
CREATE TABLE delivery_job_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    allocated_fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (allocated_fee >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_job_order UNIQUE (job_id, order_id)
);

CREATE INDEX idx_delivery_job_orders_job ON delivery_job_orders(job_id);
CREATE INDEX idx_delivery_job_orders_order ON delivery_job_orders(order_id);

-- 3. Delivery Locations (Ingestion with device timestamps for offline replay & server received_at)
CREATE TABLE delivery_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_locations_job_recorded ON delivery_locations(job_id, recorded_at ASC);

-- 4. Delivery Status History
CREATE TABLE delivery_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
    from_status VARCHAR(32),
    to_status VARCHAR(32) NOT NULL,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_status_history_job ON delivery_status_history(job_id, created_at ASC);
