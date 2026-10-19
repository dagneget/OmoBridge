-- V14__reviews_and_reporting.sql
-- Reviews, AI narrative reports, and impact metrics

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(32) NOT NULL CHECK (target_type IN ('PRODUCT', 'EXPERIENCE', 'ENTERPRISE', 'GUIDE')),
    target_id UUID NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_reviews_reviewer_target UNIQUE (reviewer_user_id, target_type, target_id)
);

CREATE INDEX idx_reviews_target ON reviews(target_type, target_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_user_id);
CREATE INDEX idx_reviews_is_public ON reviews(is_public);

CREATE TABLE ai_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    report_type VARCHAR(64) NOT NULL,
    period VARCHAR(32) NOT NULL,
    language VARCHAR(16) NOT NULL DEFAULT 'en',
    content TEXT NOT NULL,
    data_snapshot JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'GENERATED' CHECK (status IN ('GENERATED', 'APPROVED', 'REJECTED')),
    requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_ai_reports_enterprise_period ON ai_reports(enterprise_id, report_type, period);
CREATE INDEX idx_ai_reports_status ON ai_reports(status);
