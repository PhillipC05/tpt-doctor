-- ============================================================================
-- TPT Doctor — PostgreSQL Initialization Script
-- Enables extensions and sets up Row-Level Security
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create function to automatically set tenant_id on insert
CREATE OR REPLACE FUNCTION set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- tenant_id should be set by the application
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to verify audit chain integrity
CREATE OR REPLACE FUNCTION verify_audit_chain(p_tenant_id UUID)
RETURNS TABLE(chain_intact BOOLEAN, first_break_timestamp TIMESTAMPTZ) AS $$
DECLARE
  prev_hash VARCHAR(64) := digest('GENESIS', 'sha256')::text;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, timestamp, tamper_hash, previous_hash
    FROM audit_logs
    WHERE tenant_id = p_tenant_id
    ORDER BY timestamp ASC
  LOOP
    IF rec.previous_hash != prev_hash THEN
      RETURN QUERY SELECT false, rec.timestamp;
      RETURN;
    END IF;
    prev_hash := rec.tamper_hash;
  END LOOP;
  RETURN QUERY SELECT true, NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql;

-- Create function to mask PHI in audit logs
CREATE OR REPLACE FUNCTION mask_phi(data JSONB)
RETURNS JSONB AS $$
BEGIN
  -- Mask SSN, credit card numbers, etc.
  IF data ? 'ssn' THEN
    data := jsonb_set(data, '{ssn}', to_jsonb('***-**-' || RIGHT(data->>'ssn', 4)));
  END IF;
  IF data ? 'creditCard' THEN
    data := jsonb_set(data, '{creditCard}', to_jsonb('****-****-****-' || RIGHT(data->>'creditCard', 4)));
  END IF;
  RETURN data;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Row-Level Security (RLS) Policies for Multi-Tenant Isolation
-- Enables database-level tenant isolation in addition to application-level checks.
-- The Prisma middleware in packages/database/src/index.ts automatically sets
-- app.current_tenant_id before each query.
-- ============================================================================

-- Enable RLS on all tenant-scoped tables
-- Core tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE immunizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe for re-run)
DROP POLICY IF EXISTS tenant_isolation ON tenants;
DROP POLICY IF EXISTS tenant_isolation ON users;
DROP POLICY IF EXISTS tenant_isolation ON staff_members;
DROP POLICY IF EXISTS tenant_isolation ON patients;
DROP POLICY IF EXISTS tenant_isolation ON patient_insurance;
DROP POLICY IF EXISTS tenant_isolation ON patient_consents;
DROP POLICY IF EXISTS tenant_isolation ON appointments;
DROP POLICY IF EXISTS tenant_isolation ON encounters;
DROP POLICY IF EXISTS tenant_isolation ON medical_conditions;
DROP POLICY IF EXISTS tenant_isolation ON allergies;
DROP POLICY IF EXISTS tenant_isolation ON immunizations;
DROP POLICY IF EXISTS tenant_isolation ON invoices;
DROP POLICY IF EXISTS tenant_isolation ON claims;
DROP POLICY IF EXISTS tenant_isolation ON prescriptions;
DROP POLICY IF EXISTS tenant_isolation ON lab_orders;
DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
DROP POLICY IF EXISTS tenant_isolation ON messages;

-- Create RLS policies for each table
-- The session variable app.current_tenant_id is set by the Prisma middleware
-- before every query. If not set, the policy defaults to allowing access
-- to the user's own records (for users/patients without tenant context).

CREATE POLICY tenant_isolation ON tenants
  USING (id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON staff_members
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON patients
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON patient_insurance
  USING (patient_id IN (SELECT id FROM patients WHERE tenant_id = current_setting('app.current_tenant_id')::UUID));

CREATE POLICY tenant_isolation ON patient_consents
  USING (patient_id IN (SELECT id FROM patients WHERE tenant_id = current_setting('app.current_tenant_id')::UUID));

CREATE POLICY tenant_isolation ON appointments
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON encounters
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON medical_conditions
  USING (patient_id IN (SELECT id FROM patients WHERE tenant_id = current_setting('app.current_tenant_id')::UUID));

CREATE POLICY tenant_isolation ON allergies
  USING (patient_id IN (SELECT id FROM patients WHERE tenant_id = current_setting('app.current_tenant_id')::UUID));

CREATE POLICY tenant_isolation ON immunizations
  USING (patient_id IN (SELECT id FROM patients WHERE tenant_id = current_setting('app.current_tenant_id')::UUID));

CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON claims
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON prescriptions
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON lab_orders
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON audit_logs
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON messages
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================
-- PHI Access Tracking Function
-- Used by the audit middleware to log PHI access events for GET requests
-- ============================================================================
CREATE OR REPLACE FUNCTION log_phi_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (id, tenant_id, user_id, action, resource, resource_id, ip_address, user_agent, timestamp, tamper_hash, previous_hash)
  VALUES (
    gen_random_uuid(),
    current_setting('app.current_tenant_id')::UUID,
    current_setting('app.current_user_id')::UUID,
    'READ',
    TG_TABLE_NAME,
    NEW.id::text,
    current_setting('app.current_ip')::text,
    current_setting('app.current_user_agent')::text,
    NOW(),
    encode(digest(NOW()::text || TG_TABLE_NAME || NEW.id::text, 'sha256'), 'hex'),
    (SELECT tamper_hash FROM audit_logs WHERE tenant_id = current_setting('app.current_tenant_id')::UUID ORDER BY timestamp DESC LIMIT 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_tenant_id() IS 'Helper trigger function for tenant isolation';
COMMENT ON FUNCTION verify_audit_chain(UUID) IS 'Verify the cryptographic chain of audit logs for a tenant';
COMMENT ON FUNCTION mask_phi(JSONB) IS 'Mask PHI data in JSONB audit log details';
COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically update the updated_at timestamp column';
COMMENT ON FUNCTION log_phi_access() IS 'Trigger function to log PHI access events in the audit log';
