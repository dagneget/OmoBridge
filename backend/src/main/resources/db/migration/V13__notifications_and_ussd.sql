-- V13__notifications_and_ussd.sql
-- Notification dispatching, SMS communication, and USSD session state

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(32) NOT NULL,
    channel VARCHAR(32) NOT NULL CHECK (channel IN ('SMS', 'EMAIL', 'PUSH', 'USSD', 'VOICE')),
    template_code VARCHAR(64) NOT NULL,
    language VARCHAR(16) NOT NULL DEFAULT 'en',
    message TEXT NOT NULL,
    related_type VARCHAR(64),
    related_id UUID,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENT', 'FAILED')),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    next_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_notifications_status_next_attempt ON notifications(status, next_attempt_at);
CREATE INDEX idx_notifications_recipient_phone ON notifications(recipient_phone);
CREATE INDEX idx_notifications_recipient_user_id ON notifications(recipient_user_id);

CREATE TABLE sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direction VARCHAR(16) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    phone VARCHAR(32) NOT NULL,
    body TEXT NOT NULL,
    provider_reference VARCHAR(128),
    status VARCHAR(32) NOT NULL CHECK (status IN ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'RECEIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_sms_messages_phone ON sms_messages(phone);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);

CREATE TABLE ussd_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(128) NOT NULL UNIQUE,
    phone VARCHAR(32) NOT NULL,
    language VARCHAR(16) NOT NULL DEFAULT 'am',
    current_menu VARCHAR(64) NOT NULL DEFAULT 'MAIN',
    state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_ussd_sessions_phone ON ussd_sessions(phone);
CREATE INDEX idx_ussd_sessions_expires_at ON ussd_sessions(expires_at);
