-- ============================================================================
-- Migration 001: Initial Schema
-- Expert Witness Practice Management System
-- Tables: cases, contacts, case_contacts, system_settings, user_preferences, audit_log
-- ============================================================================

-- ===========================================
-- Helper: updated_at trigger function
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- Table: cases
-- ===========================================
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(20) UNIQUE,
    case_name VARCHAR(500) NOT NULL,
    case_type VARCHAR(50) NOT NULL CHECK (case_type IN (
        'medical_malpractice', 'personal_injury', 'product_liability',
        'criminal', 'peer_review', 'licensing_board', 'other'
    )),
    specialty_area VARCHAR(50) CHECK (specialty_area IN (
        'general_anesthesia', 'regional', 'obstetric', 'pediatric',
        'cardiac', 'neuro', 'pain_management', 'critical_care', 'other'
    )),
    side VARCHAR(20) CHECK (side IN ('plaintiff', 'defense', 'neutral')),
    status VARCHAR(30) NOT NULL DEFAULT 'inquiry' CHECK (status IN (
        'inquiry', 'conflict_check', 'accepted', 'active',
        'opinion_issued', 'deposition_scheduled', 'deposition_complete',
        'trial_scheduled', 'trial_complete', 'closed', 'declined', 'withdrawn'
    )),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN (
        'urgent', 'high', 'normal', 'low'
    )),

    -- Dates
    date_of_incident DATE,
    date_received DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline_initial_review DATE,
    deadline_report DATE,
    deadline_deposition DATE,
    deadline_trial DATE,

    -- Jurisdiction
    jurisdiction_state VARCHAR(50),
    jurisdiction_court VARCHAR(255),
    court_case_number VARCHAR(100),

    -- Patient Information
    patient_name VARCHAR(255),
    patient_dob DATE,
    patient_age_at_incident INTEGER,
    patient_gender VARCHAR(20),
    patient_outcome VARCHAR(30) CHECK (patient_outcome IN (
        'death', 'permanent_injury', 'temporary_injury', 'no_injury', 'unknown'
    )),

    -- Case Details
    brief_summary TEXT,
    key_issues TEXT[],

    -- Opinion
    preliminary_opinion VARCHAR(30) CHECK (preliminary_opinion IN (
        'supportive', 'non_supportive', 'mixed', 'insufficient_records', 'pending'
    )),
    opinion_strength INTEGER CHECK (opinion_strength >= 1 AND opinion_strength <= 10),
    opinion_summary TEXT,
    standard_of_care_issues TEXT[],
    causation_issues TEXT[],
    damages_summary TEXT,

    -- Financial
    retainer_required BOOLEAN DEFAULT true,
    retainer_amount DECIMAL(10,2),
    retainer_received BOOLEAN DEFAULT false,
    retainer_received_date DATE,
    estimated_hours DECIMAL(8,2),
    actual_hours_total DECIMAL(8,2) DEFAULT 0,
    total_billed DECIMAL(12,2) DEFAULT 0,
    total_paid DECIMAL(12,2) DEFAULT 0,
    balance_due DECIMAL(12,2) DEFAULT 0,

    -- Misc
    referral_source VARCHAR(255),
    notes TEXT,

    -- AI
    ai_case_summary TEXT,
    ai_summary_updated_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- Auto-generate case_number on INSERT
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year TEXT;
    next_seq INTEGER;
BEGIN
    IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
        current_year := TO_CHAR(NOW(), 'YYYY');

        SELECT COALESCE(MAX(
            CAST(SUBSTRING(case_number FROM 'EW-' || current_year || '-(\d+)') AS INTEGER)
        ), 0) + 1
        INTO next_seq
        FROM cases
        WHERE case_number LIKE 'EW-' || current_year || '-%';

        NEW.case_number := 'EW-' || current_year || '-' || LPAD(next_seq::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_case_number
    BEFORE INSERT ON cases
    FOR EACH ROW
    EXECUTE FUNCTION generate_case_number();

CREATE TRIGGER trigger_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for cases
CREATE INDEX idx_cases_case_number ON cases(case_number);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_case_type ON cases(case_type);
CREATE INDEX idx_cases_side ON cases(side);
CREATE INDEX idx_cases_priority ON cases(priority);
CREATE INDEX idx_cases_date_received ON cases(date_received);
CREATE INDEX idx_cases_deadline_initial_review ON cases(deadline_initial_review);
CREATE INDEX idx_cases_deadline_report ON cases(deadline_report);
CREATE INDEX idx_cases_deadline_deposition ON cases(deadline_deposition);
CREATE INDEX idx_cases_deadline_trial ON cases(deadline_trial);
CREATE INDEX idx_cases_jurisdiction_state ON cases(jurisdiction_state);
CREATE INDEX idx_cases_patient_name ON cases(patient_name);
CREATE INDEX idx_cases_created_at ON cases(created_at);

-- ===========================================
-- Table: contacts
-- ===========================================
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_type VARCHAR(30) NOT NULL CHECK (contact_type IN (
        'attorney', 'law_firm', 'paralegal', 'expert',
        'medical_provider', 'insurance', 'court', 'other'
    )),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    organization_name VARCHAR(255),
    title VARCHAR(100),
    email VARCHAR(255),
    phone_primary VARCHAR(30),
    phone_secondary VARCHAR(30),
    fax VARCHAR(30),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(50),
    address_zip VARCHAR(20),
    bar_number VARCHAR(50),
    specialty VARCHAR(100),
    preferred_communication VARCHAR(10) CHECK (preferred_communication IN (
        'email', 'phone', 'fax'
    )),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for contacts
CREATE INDEX idx_contacts_contact_type ON contacts(contact_type);
CREATE INDEX idx_contacts_last_name ON contacts(last_name);
CREATE INDEX idx_contacts_organization ON contacts(organization_name);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_is_active ON contacts(is_active);

-- ===========================================
-- Table: case_contacts (junction)
-- ===========================================
CREATE TABLE case_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL CHECK (role IN (
        'retaining_attorney', 'opposing_attorney', 'co_counsel',
        'paralegal', 'law_firm', 'opposing_expert', 'co_expert',
        'treating_physician', 'medical_provider', 'insurance_adjuster',
        'plaintiff', 'defendant', 'court_clerk', 'judge',
        'mediator', 'court_reporter', 'other'
    )),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(case_id, contact_id, role)
);

-- Indexes for case_contacts
CREATE INDEX idx_case_contacts_case_id ON case_contacts(case_id);
CREATE INDEX idx_case_contacts_contact_id ON case_contacts(contact_id);
CREATE INDEX idx_case_contacts_role ON case_contacts(role);

-- ===========================================
-- Table: system_settings
-- ===========================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(20) NOT NULL DEFAULT 'string' CHECK (setting_type IN (
        'string', 'number', 'boolean', 'json', 'array'
    )),
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    description TEXT,
    is_sensitive BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- ===========================================
-- Table: user_preferences
-- ===========================================
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_key ON user_preferences(preference_key);

-- ===========================================
-- Table: audit_log
-- ===========================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ===========================================
-- Row Level Security
-- ===========================================
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users have full access to cases"
    ON cases FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to contacts"
    ON contacts FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to case_contacts"
    ON case_contacts FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to system_settings"
    ON system_settings FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to user_preferences"
    ON user_preferences FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to audit_log"
    ON audit_log FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ===========================================
-- Seed Data: System Settings
-- ===========================================
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
    ('expert_name', '"Marc Ettinger, MD"', 'string', 'profile', 'Expert witness full name and credentials'),
    ('expert_specialty', '"Anesthesiology"', 'string', 'profile', 'Primary medical specialty'),
    ('expert_license_state', '"California"', 'string', 'profile', 'State of medical license'),
    ('expert_cv_url', '""', 'string', 'profile', 'URL to current CV document'),
    ('default_hourly_rate', '500', 'number', 'billing', 'Default hourly rate for record review'),
    ('deposition_rate', '750', 'number', 'billing', 'Hourly rate for deposition testimony'),
    ('trial_rate', '1000', 'number', 'billing', 'Hourly rate for trial testimony'),
    ('travel_rate', '250', 'number', 'billing', 'Hourly rate for travel time'),
    ('default_retainer_amount', '5000', 'number', 'billing', 'Default retainer amount for new cases'),
    ('case_number_prefix', '"EW"', 'string', 'cases', 'Prefix for auto-generated case numbers'),
    ('case_number_format', '"EW-YYYY-NNNN"', 'string', 'cases', 'Format pattern for case numbers'),
    ('business_name', '"Marc Ettinger, MD - Expert Witness Services"', 'string', 'profile', 'Business name for invoices'),
    ('business_address', '"California"', 'string', 'profile', 'Business address'),
    ('business_phone', '""', 'string', 'profile', 'Business phone number'),
    ('business_email', '""', 'string', 'profile', 'Business email address'),
    ('business_tax_id', '""', 'string', 'profile', 'Tax ID / EIN for invoices'),
    ('invoice_payment_terms', '30', 'number', 'billing', 'Default payment terms in days'),
    ('invoice_notes', '"Payment due within 30 days of invoice date. Thank you for your prompt payment."', 'string', 'billing', 'Default notes on invoices'),
    ('ai_provider', '"anthropic"', 'string', 'ai', 'AI provider (anthropic, openai)'),
    ('ai_model', '"claude-sonnet-4-20250514"', 'string', 'ai', 'Default AI model'),
    ('ai_auto_summarize', 'true', 'boolean', 'ai', 'Automatically generate AI summaries for new documents'),
    ('ai_auto_timeline', 'true', 'boolean', 'ai', 'Automatically extract timeline events from documents');
