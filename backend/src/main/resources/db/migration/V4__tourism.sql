-- V4__tourism.sql
-- Tourism packages, cultural experiences, accommodations, transport, safety guidelines, and availability sessions

CREATE TABLE tour_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    overview TEXT NOT NULL,
    story TEXT,
    location_text VARCHAR(255) NOT NULL,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    directions TEXT,
    opening_hours VARCHAR(100),
    duration_hours NUMERIC(6,2),
    max_group_size INT NOT NULL CHECK (max_group_size > 0),
    price_amount NUMERIC(14,2) NOT NULL CHECK (price_amount >= 0),
    price_unit VARCHAR(50) NOT NULL DEFAULT 'PER_PERSON',
    currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
    cultural_rules TEXT,
    safety_notes TEXT,
    community_approval_ref VARCHAR(100),
    community_approval_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    location_text VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(30),
    contact_email VARCHAR(255),
    price_from NUMERIC(14,2) NOT NULL CHECK (price_from >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
    amenities TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE transport_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    service_name VARCHAR(200) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    route_description VARCHAR(255) NOT NULL,
    price_amount NUMERIC(14,2) NOT NULL CHECK (price_amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
    contact_phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE safety_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    emergency_contacts TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tour_availability_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES tour_packages(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    booked_count INT NOT NULL DEFAULT 0 CHECK (booked_count >= 0 AND booked_count <= capacity),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_package_session_datetime UNIQUE (package_id, session_date, start_time)
);

CREATE INDEX idx_tour_packages_enterprise ON tour_packages(enterprise_id);
CREATE INDEX idx_tour_packages_category ON tour_packages(category);
CREATE INDEX idx_tour_packages_active ON tour_packages(is_active);
CREATE INDEX idx_hotels_enterprise ON hotels(enterprise_id);
CREATE INDEX idx_transport_enterprise ON transport_services(enterprise_id);
CREATE INDEX idx_tour_sessions_package_date ON tour_availability_sessions(package_id, session_date);
