-- V8__production_and_traceability.sql
-- Production batches, inputs, outputs, losses, trace records, and public scans

-- 1. Production Batches
CREATE TABLE production_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code VARCHAR(50) NOT NULL UNIQUE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'COMPLETED', 'CANCELLED')),
    processed_at TIMESTAMP WITH TIME ZONE,
    labor_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    processing_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    packaging_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_production_batches_enterprise ON production_batches(enterprise_id, status);

-- 2. Production Inputs (Restricts deletion of used inventory lots)
CREATE TABLE production_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    lot_id UUID NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_production_inputs_batch ON production_inputs(batch_id);
CREATE INDEX idx_production_inputs_lot ON production_inputs(lot_id);

-- 3. Production Outputs
CREATE TABLE production_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    product_type_id UUID NOT NULL REFERENCES product_types(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(30) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    resulting_lot_id UUID REFERENCES inventory_lots(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_production_outputs_batch ON production_outputs(batch_id);
CREATE INDEX idx_production_outputs_product ON production_outputs(product_type_id);

-- 4. Production Losses
CREATE TABLE production_losses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity >= 0),
    unit VARCHAR(30) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_production_losses_batch ON production_losses(batch_id);

-- 5. Trace Records
CREATE TABLE trace_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL UNIQUE REFERENCES production_batches(id) ON DELETE RESTRICT,
    public_token VARCHAR(64) NOT NULL UNIQUE,
    origin_village VARCHAR(100),
    origin_label VARCHAR(150),
    processing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    public_story TEXT,
    show_farmer_names BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_trace_records_token ON trace_records(public_token);
CREATE INDEX idx_trace_records_batch ON trace_records(batch_id);

-- 6. Trace Scans
CREATE TABLE trace_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_record_id UUID NOT NULL REFERENCES trace_records(id) ON DELETE CASCADE,
    scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX idx_trace_scans_record ON trace_scans(trace_record_id, scanned_at DESC);
