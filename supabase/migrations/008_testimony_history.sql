-- ============================================================================
-- Migration 008: Testimony History
-- Expert Witness Practice Management System
-- Tracks Dr. Ettinger's prior deposition and trial testimony
-- (FRCP 26(a)(2)(B)(v) — 4-year list)
-- ============================================================================

-- ===========================================
-- Table: testimony_history
-- ===========================================
CREATE TABLE testimony_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Optional links to internal records (NULL for back-populated entries)
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    deposition_id UUID REFERENCES depositions(id) ON DELETE SET NULL,

    -- Case identification (always populated, even if linked)
    case_caption TEXT NOT NULL,
    case_number TEXT,
    court_venue TEXT,
    jurisdiction TEXT,

    -- Testimony details
    testimony_date DATE NOT NULL,
    testimony_type VARCHAR(20) NOT NULL CHECK (testimony_type IN (
        'deposition', 'trial', 'hearing', 'arbitration'
    )),
    side_retained_by VARCHAR(20) NOT NULL CHECK (side_retained_by IN (
        'plaintiff', 'defense', 'unknown'
    )),

    -- Retaining counsel
    retaining_attorney TEXT,
    retaining_firm TEXT,

    -- Notes & visibility
    notes TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,

    -- Provenance
    source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN (
        'manual', 'auto_deposition', 'imported'
    )),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_testimony_history_updated_at
    BEFORE UPDATE ON testimony_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_testimony_history_date ON testimony_history(testimony_date DESC);
CREATE INDEX idx_testimony_history_type ON testimony_history(testimony_type);
CREATE INDEX idx_testimony_history_published ON testimony_history(is_published);
CREATE INDEX idx_testimony_history_case_id ON testimony_history(case_id);
CREATE INDEX idx_testimony_history_deposition_id ON testimony_history(deposition_id);

-- Prevent duplicate auto-entries when a deposition is updated repeatedly
CREATE UNIQUE INDEX idx_testimony_history_unique_deposition
    ON testimony_history(deposition_id)
    WHERE deposition_id IS NOT NULL;

-- ===========================================
-- Auto-feed: completed Ettinger depositions → testimony_history
-- ===========================================
-- When a depositions row reaches status='completed' AND the deponent is
-- Dr. Ettinger (deponent_role='expert_witness' AND name match), upsert
-- a testimony_history row.
CREATE OR REPLACE FUNCTION sync_deposition_to_testimony_history()
RETURNS TRIGGER AS $$
DECLARE
    v_case_caption TEXT;
    v_case_number TEXT;
    v_jurisdiction_court TEXT;
    v_jurisdiction_state TEXT;
    v_side TEXT;
BEGIN
    -- Only fire for completed depositions where the deponent is Dr. Ettinger
    -- (expert_witness role + name contains 'Ettinger', case-insensitive)
    IF NEW.status = 'completed'
       AND NEW.deponent_role = 'expert_witness'
       AND NEW.deponent_name ILIKE '%ettinger%' THEN

        -- Pull case context
        SELECT
            COALESCE(case_name, 'Untitled Case'),
            jurisdiction_court,
            jurisdiction_state,
            side
        INTO v_case_caption, v_jurisdiction_court, v_jurisdiction_state, v_side
        FROM cases
        WHERE id = NEW.case_id;

        v_case_number := NULL; -- cases table has no docket field; user can edit later

        -- Map case 'side' to disclosure side
        v_side := CASE
            WHEN v_side = 'plaintiff' THEN 'plaintiff'
            WHEN v_side IN ('defense', 'defendant') THEN 'defense'
            ELSE 'unknown'
        END;

        -- Upsert by deposition_id
        INSERT INTO testimony_history (
            case_id, deposition_id, case_caption, case_number,
            court_venue, jurisdiction, testimony_date, testimony_type,
            side_retained_by, source
        )
        VALUES (
            NEW.case_id, NEW.id, v_case_caption, v_case_number,
            v_jurisdiction_court, v_jurisdiction_state, NEW.deposition_date,
            'deposition', v_side, 'auto_deposition'
        )
        ON CONFLICT (deposition_id) WHERE deposition_id IS NOT NULL
        DO UPDATE SET
            testimony_date = EXCLUDED.testimony_date,
            case_caption = EXCLUDED.case_caption,
            court_venue = EXCLUDED.court_venue,
            jurisdiction = EXCLUDED.jurisdiction,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_deposition_to_testimony
    AFTER INSERT OR UPDATE ON depositions
    FOR EACH ROW
    EXECUTE FUNCTION sync_deposition_to_testimony_history();

-- ===========================================
-- RLS
-- ===========================================
ALTER TABLE testimony_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access to testimony_history"
    ON testimony_history
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Anonymous (portal/public) can read published entries only
CREATE POLICY "Anonymous can read published testimony_history"
    ON testimony_history
    FOR SELECT
    TO anon
    USING (is_published = true);
