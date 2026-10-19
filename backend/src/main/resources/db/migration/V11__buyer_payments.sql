-- V11__buyer_payments.sql
-- Buyer payments for orders and bookings, payment attempts with idempotency, verified webhook events, refunds, and community fund ledger

-- 1. Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES orders(id) ON DELETE RESTRICT,
    booking_id UUID REFERENCES bookings(id) ON DELETE RESTRICT,
    CONSTRAINT chk_payment_target CHECK (
        (order_id IS NOT NULL AND booking_id IS NULL) OR
        (order_id IS NULL AND booking_id IS NOT NULL)
    ),
    payer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    status VARCHAR(32) NOT NULL CHECK (
        status IN ('PENDING', 'HELD', 'RELEASED', 'REFUNDED', 'FAILED')
    ),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_payer ON payments(payer_user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- 2. Payment Attempts (Gateway invocations with strict idempotency)
CREATE TABLE payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,
    provider_reference VARCHAR(100),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    status VARCHAR(32) NOT NULL CHECK (status IN ('INITIATED', 'SUCCESS', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_payment_attempts_payment ON payment_attempts(payment_id);

-- 3. Provider Events (Verified gateway webhook payloads, deduplicated by provider_event_id)
CREATE TABLE provider_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    provider_event_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB,
    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_provider_event UNIQUE (provider, provider_event_id)
);

CREATE INDEX idx_provider_events_provider ON provider_events(provider, provider_event_id);

-- 4. Refunds (Full or partial refunds, strictly bounded by payment amount)
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    refund_no VARCHAR(64) NOT NULL UNIQUE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    reason TEXT,
    status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    created_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_refunds_payment ON refunds(payment_id);

-- 5. Community Fund Ledger (Transparent community contribution ledger from completed transactions)
CREATE TABLE community_fund_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('ORDER', 'BOOKING')),
    source_id UUID NOT NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE RESTRICT,
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    entry_type VARCHAR(32) NOT NULL CHECK (entry_type IN ('CREDIT', 'DEBIT_REVERSAL')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_community_fund_source ON community_fund_ledger(source_type, source_id);
CREATE INDEX idx_community_fund_enterprise ON community_fund_ledger(enterprise_id);
