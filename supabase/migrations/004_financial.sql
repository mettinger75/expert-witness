-- ============================================================================
-- Migration 004: Financial
-- Expert Witness Practice Management System
-- Tables: billing_rates, time_entries, invoices, invoice_line_items, payments
-- ============================================================================

-- ===========================================
-- Table: billing_rates
-- ===========================================
CREATE TABLE billing_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type VARCHAR(50) NOT NULL UNIQUE CHECK (activity_type IN (
        'record_review', 'report_writing', 'deposition_testimony',
        'trial_testimony', 'phone_conference', 'travel',
        'research', 'consultation', 'court_appearance',
        'file_review', 'correspondence', 'other'
    )),
    description VARCHAR(255) NOT NULL,
    rate_per_hour DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_billing_rates_updated_at
    BEFORE UPDATE ON billing_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_billing_rates_activity_type ON billing_rates(activity_type);
CREATE INDEX idx_billing_rates_is_active ON billing_rates(is_active);

-- ===========================================
-- Table: time_entries
-- ===========================================
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    billing_rate_id UUID REFERENCES billing_rates(id) ON DELETE SET NULL,

    -- Time Details
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'record_review', 'report_writing', 'deposition_testimony',
        'trial_testimony', 'phone_conference', 'travel',
        'research', 'consultation', 'court_appearance',
        'file_review', 'correspondence', 'other'
    )),
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_hours DECIMAL(6,2) NOT NULL,
    is_timer_entry BOOLEAN NOT NULL DEFAULT false,

    -- Billing
    rate_per_hour DECIMAL(10,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    is_billable BOOLEAN NOT NULL DEFAULT true,
    is_billed BOOLEAN NOT NULL DEFAULT false,
    invoice_id UUID,  -- FK added after invoices table creation

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'submitted', 'approved', 'invoiced', 'written_off'
    )),

    -- Notes
    internal_notes TEXT,

    -- Related Records
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    deposition_id UUID REFERENCES depositions(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_time_entries_updated_at
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for time_entries
CREATE INDEX idx_time_entries_case_id ON time_entries(case_id);
CREATE INDEX idx_time_entries_billing_rate_id ON time_entries(billing_rate_id);
CREATE INDEX idx_time_entries_activity_type ON time_entries(activity_type);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_is_billable ON time_entries(is_billable);
CREATE INDEX idx_time_entries_is_billed ON time_entries(is_billed);
CREATE INDEX idx_time_entries_invoice_id ON time_entries(invoice_id);
CREATE INDEX idx_time_entries_status ON time_entries(status);
CREATE INDEX idx_time_entries_document_id ON time_entries(document_id);
CREATE INDEX idx_time_entries_deposition_id ON time_entries(deposition_id);

-- ===========================================
-- Table: invoices
-- ===========================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Invoice Details
    invoice_number VARCHAR(30) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    period_start DATE,
    period_end DATE,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_review', 'approved', 'sent', 'viewed',
        'partial_payment', 'paid', 'overdue', 'disputed',
        'written_off', 'cancelled', 'void'
    )),

    -- Amounts
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,4) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_description VARCHAR(255),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Billing Contact
    bill_to_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    bill_to_name VARCHAR(255),
    bill_to_organization VARCHAR(255),
    bill_to_address TEXT,
    bill_to_email VARCHAR(255),

    -- Payment Info
    payment_terms INTEGER DEFAULT 30,
    payment_instructions TEXT,

    -- Notes
    notes TEXT,
    internal_notes TEXT,

    -- Delivery
    sent_at TIMESTAMPTZ,
    sent_method VARCHAR(20) CHECK (sent_method IN (
        'email', 'mail', 'portal', 'hand_delivery'
    )),
    viewed_at TIMESTAMPTZ,
    last_reminder_sent_at TIMESTAMPTZ,
    reminder_count INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Now add the FK from time_entries to invoices
ALTER TABLE time_entries
    ADD CONSTRAINT fk_time_entries_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- Indexes for invoices
CREATE INDEX idx_invoices_case_id ON invoices(case_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_bill_to_contact ON invoices(bill_to_contact_id);
CREATE INDEX idx_invoices_balance_due ON invoices(balance_due);

-- ===========================================
-- Table: invoice_line_items
-- ===========================================
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,

    -- Line Item Details
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    activity_type VARCHAR(50),
    date DATE,
    quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,

    -- Classification
    is_expense BOOLEAN NOT NULL DEFAULT false,
    is_taxable BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_invoice_line_items_updated_at
    BEFORE UPDATE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_time_entry_id ON invoice_line_items(time_entry_id);
CREATE INDEX idx_invoice_line_items_date ON invoice_line_items(date);

-- ===========================================
-- Table: payments
-- ===========================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Payment Details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(30) CHECK (payment_method IN (
        'check', 'wire_transfer', 'ach', 'credit_card',
        'cash', 'money_order', 'other'
    )),
    reference_number VARCHAR(100),
    check_number VARCHAR(50),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN (
        'pending', 'received', 'cleared', 'bounced', 'refunded', 'cancelled'
    )),

    -- Notes
    notes TEXT,
    received_from VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_case_id ON payments(case_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(status);

-- ===========================================
-- Row Level Security
-- ===========================================
ALTER TABLE billing_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users have full access to billing_rates"
    ON billing_rates FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to time_entries"
    ON time_entries FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to invoices"
    ON invoices FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to invoice_line_items"
    ON invoice_line_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to payments"
    ON payments FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ===========================================
-- Seed Data: Default Billing Rates
-- ===========================================
INSERT INTO billing_rates (activity_type, description, rate_per_hour) VALUES
    ('record_review', 'Medical record review and analysis', 500.00),
    ('report_writing', 'Expert report and opinion writing', 500.00),
    ('deposition_testimony', 'Deposition testimony', 750.00),
    ('trial_testimony', 'Trial testimony and courtroom appearance', 1000.00),
    ('phone_conference', 'Telephone conference with attorneys', 500.00),
    ('travel', 'Travel time to depositions and trials', 250.00),
    ('research', 'Medical literature research', 500.00),
    ('consultation', 'Case consultation and strategy discussion', 500.00),
    ('court_appearance', 'Court appearance (non-testimony)', 750.00),
    ('file_review', 'File organization and review', 500.00),
    ('correspondence', 'Written correspondence and communications', 500.00),
    ('other', 'Other professional services', 500.00);
