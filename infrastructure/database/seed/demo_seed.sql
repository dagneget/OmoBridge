-- OmoBridge Demo Seed Data
-- Safely inserts demonstration data for local development

BEGIN;

-- 1. Demo Users (Password: Secret@123, BCrypt: $2a$10$iDkTwH.G0NrMU8ZGzpLZM.V9NKH5fSnMyjviSKCHgw0anRki8xcWq)
INSERT INTO users (id, phone_number, email, full_name, password_hash, status, preferred_language)
VALUES
    ('b0000000-0000-0000-0000-000000000001', '+251911000001', 'admin@omobridge.et', 'Zonal Admin', '$2a$10$iDkTwH.G0NrMU8ZGzpLZM.V9NKH5fSnMyjviSKCHgw0anRki8xcWq', 'ACTIVE', 'en'),
    ('b0000000-0000-0000-0000-000000000002', '+251911000002', 'dimeka@omobridge.et', 'Dimeka Union Manager', '$2a$10$iDkTwH.G0NrMU8ZGzpLZM.V9NKH5fSnMyjviSKCHgw0anRki8xcWq', 'ACTIVE', 'en'),
    ('b0000000-0000-0000-0000-000000000003', '+251911000003', 'bono@omobridge.et', 'Bono Gedo', '$2a$10$iDkTwH.G0NrMU8ZGzpLZM.V9NKH5fSnMyjviSKCHgw0anRki8xcWq', 'ACTIVE', 'am'),
    ('b0000000-0000-0000-0000-000000000004', '+251911000004', 'ayke@omobridge.et', 'Ayke Banna', '$2a$10$iDkTwH.G0NrMU8ZGzpLZM.V9NKH5fSnMyjviSKCHgw0anRki8xcWq', 'ACTIVE', 'en'),
    ('b0000000-0000-0000-0000-000000000005', '+251911000005', 'buyer@omobridge.et', 'Helena Vance', '$2a$10$iDkTwH.G0NrMU8ZGzpLZM.V9NKH5fSnMyjviSKCHgw0anRki8xcWq', 'ACTIVE', 'en')
ON CONFLICT (phone_number) DO NOTHING;

-- 2. User Roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.phone_number = '+251911000001' AND r.name = 'SYSTEM_ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.phone_number = '+251911000002' AND r.name = 'MICRO_ENTERPRISE'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.phone_number = '+251911000003' AND r.name = 'PRODUCER_FARMER'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.phone_number = '+251911000004' AND r.name = 'TOUR_GUIDE'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.phone_number = '+251911000005' AND r.name = 'BUYER_VISITOR'
ON CONFLICT DO NOTHING;

-- 3. Demo Enterprise
INSERT INTO enterprises (id, owner_user_id, name, registration_number, contact_phone, location_woreda, location_town, status)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Dimeka Agro Cooperative Union', 'COOP-DIMEKA-001', '+251911000002', 'Hamer', 'Dimeka', 'ACTIVE')
ON CONFLICT DO NOTHING;

-- 4. Demo Farmer
INSERT INTO farmers (id, user_id, enterprise_id, farmer_code, village, verification_status)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'FARM-BONO-01', 'Alduba', 'VERIFIED')
ON CONFLICT (farmer_code) DO NOTHING;

-- 5. Product Types & Buying Prices
INSERT INTO product_types (id, code, name, category, unit, description)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'RAW-HONEY-WHITE', 'Wild White Forest Honey', 'HONEY', 'kg', 'Raw pure comb honey harvested from Hamer mountain forests.'),
    ('e0000000-0000-0000-0000-000000000002', 'RAW-COFFEE-CHERRIES', 'Sun-Dried Highland Coffee', 'COFFEE', 'kg', 'Organic shade-grown wild arabica coffee cherries.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO buying_prices (id, enterprise_id, product_type_id, grade, price_per_unit, effective_from, is_active)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'GRADE_1', 350.00, NOW() - INTERVAL '30 days', TRUE)
ON CONFLICT DO NOTHING;

-- 6. Warehouse Location
INSERT INTO inventory_locations (id, enterprise_id, name, location_type, description)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Dimeka Central Warehouse', 'WAREHOUSE', 'Main temperature-controlled honey & grain storage')
ON CONFLICT DO NOTHING;

COMMIT;
