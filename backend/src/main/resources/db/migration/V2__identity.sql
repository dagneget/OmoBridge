-- V2__identity.sql
-- Core Identity & Access Schema for OmoBridge Platform Actors

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- Seed baseline roles
INSERT INTO roles (name, description) VALUES
    ('BUYER_VISITOR', 'Visitor or buyer purchasing local produce and tourism services'),
    ('PRODUCER_FARMER', 'Rural producer or farmer supplying commodities'),
    ('MICRO_ENTERPRISE', 'Community cooperative or local micro-enterprise aggregator'),
    ('DELIVERY_PROVIDER', 'Transporter or courier fulfilling delivery orders'),
    ('TOUR_GUIDE', 'Certified local community tour guide'),
    ('TOURISM_AUTHORITY', 'Regional tourism office or compliance auditor'),
    ('SYSTEM_ADMIN', 'Platform technical administrator');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE enterprises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(150) NOT NULL,
    registration_number VARCHAR(100),
    contact_phone VARCHAR(30) NOT NULL,
    contact_email VARCHAR(255),
    location_woreda VARCHAR(100) NOT NULL,
    location_town VARCHAR(100) NOT NULL,
    location_address VARCHAR(255),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE enterprise_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'MANAGER', 'STAFF', 'MEMBER')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_enterprise_staff_user UNIQUE (enterprise_id, user_id)
);

CREATE TABLE farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enterprise_id UUID REFERENCES enterprises(id),
    farmer_code VARCHAR(30) NOT NULL UNIQUE,
    village VARCHAR(100) NOT NULL,
    kebele VARCHAR(100),
    id_card_number VARCHAR(100),
    telebirr_phone VARCHAR(30),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    consent_public_name BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE delivery_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL CHECK (vehicle_type IN ('MOTORCYCLE', 'TRUCK', 'VAN', 'BAJAJ', 'BICYCLE', 'FOOT')),
    vehicle_plate_number VARCHAR(50),
    license_number VARCHAR(100),
    service_area VARCHAR(150),
    is_available BOOLEAN NOT NULL DEFAULT FALSE,
    current_latitude NUMERIC(10,7),
    current_longitude NUMERIC(10,7),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(100),
    bio TEXT,
    languages TEXT[] DEFAULT '{}',
    specialties TEXT,
    daily_rate NUMERIC(14,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

-- Performance and lookup indexes
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_enterprises_owner ON enterprises(owner_user_id);
CREATE INDEX idx_enterprises_status ON enterprises(status);
CREATE INDEX idx_enterprise_staff_enterprise ON enterprise_staff(enterprise_id);
CREATE INDEX idx_enterprise_staff_user ON enterprise_staff(user_id);
CREATE INDEX idx_farmers_user ON farmers(user_id);
CREATE INDEX idx_farmers_enterprise ON farmers(enterprise_id);
CREATE INDEX idx_farmers_code ON farmers(farmer_code);
CREATE INDEX idx_farmers_status ON farmers(verification_status);
CREATE INDEX idx_delivery_providers_user ON delivery_providers(user_id);
CREATE INDEX idx_delivery_providers_status ON delivery_providers(verification_status);
CREATE INDEX idx_guides_user ON guides(user_id);
CREATE INDEX idx_guides_status ON guides(verification_status);
