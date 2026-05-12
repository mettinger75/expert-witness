-- =============================================================================
-- Align invoices.status CHECK constraint with the application code
-- =============================================================================
-- The original constraint allowed 'partial_payment', but the entire TS codebase
-- (INVOICE_STATUSES, paymentsService, Stripe webhook, dashboard/finance/portal
-- filters) writes and reads 'partial'. This mismatch meant any partial payment
-- recorded by the app — including a successful Stripe webhook — would fail the
-- CHECK constraint and silently drop the invoice status update.
--
-- This migration replaces 'partial_payment' with 'partial' to match the app.
-- No existing rows used 'partial_payment'.

ALTER TABLE invoices DROP CONSTRAINT invoices_status_check;

ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN (
    'draft',
    'pending_review',
    'approved',
    'sent',
    'viewed',
    'partial',
    'paid',
    'overdue',
    'disputed',
    'written_off',
    'cancelled',
    'void'
  ));
