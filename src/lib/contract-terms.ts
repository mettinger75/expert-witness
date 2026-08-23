import type { BillingRateRow } from '@/types/database.types'

/**
 * Canonical engagement terms. Rates are DERIVED FROM the `billing_rates` table —
 * that table is the one source of truth, and nothing in the app should carry its
 * own copy of a rate.
 *
 * Before this module existed the same rate lived in five places that disagreed:
 * the contract create API said $500/hr, the contract form $700, the portal
 * invite dialog $500, the time-entry form $500, and `billing_rates` itself $700.
 * Time logged from the billing page therefore defaulted to $500/hr — $200 under
 * the real rate on every entry. Scope and special-provision text had no default
 * at all and was retyped per contract, which is why no two executed agreements
 * read alike.
 *
 * To change a rate, edit `billing_rates` (Settings → Billing). To change a
 * policy term, edit STANDARD_TERMS here.
 */

/** Policy terms that are not rates and so do not live in `billing_rates`. */
export const STANDARD_TERMS = {
  /** Deposition testimony bills the hourly rate against this many hours minimum. */
  depositionMinimumHours: 6,
  /** Hourly work is rounded to this increment. */
  billingIncrementHours: 0.5,
  /** Deposition and trial fees fall due this many days before the appearance. */
  appearancePrepaymentDays: 7,
  /** An appearance cancelled inside this window forfeits half of any advance. */
  partialCancellationDays: 5,
  /** Inside this window a cancelled appearance is billed at the full day rate. */
  cancellationFeeHours: 48,
  /** Invoice payment window. */
  paymentTermsDays: 30,
  /**
   * No advance retainer by default. The protection instead comes from Section 2
   * of the agreement: the final report is not released, and testimony is not
   * given, until fees are paid. Set a non-zero amount per engagement when one
   * is warranted.
   */
  retainerAmount: 0,
} as const

/**
 * Used only when `billing_rates` cannot be read (network failure, first render
 * before the query resolves). Mirrors the table's current values so a fallback
 * never silently under-bills.
 */
const FALLBACK_RATES = {
  hourlyRate: 700,
  depositionHourlyRate: 700,
  trialDayRate: 5000,
} as const

export interface ContractRates {
  hourlyRate: number
  depositionRate: number
  trialRate: number
  retainerAmount: number
  cancellationFeeHours: number
  paymentTermsDays: number
}

type RateSource = Pick<
  BillingRateRow,
  'activity_type' | 'rate_per_hour' | 'daily_rate' | 'is_active' | 'end_date'
>

/**
 * Map `billing_rates` rows onto the rate set an agreement quotes.
 *
 * Deposition testimony is quoted as a day rate because that is how firms buy it,
 * but it is derived — hourly rate × the 6-hour minimum — so raising the hourly
 * rate in one place raises the deposition quote with it.
 */
export function deriveContractRates(rates: RateSource[] | null | undefined): ContractRates {
  const active = (rates ?? []).filter((r) => r.is_active !== false && r.end_date === null)
  const pick = (activityType: string) => active.find((r) => r.activity_type === activityType)

  const num = (v: number | string | null | undefined): number | null => {
    if (v === null || v === undefined) return null
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  const hourlyRate =
    num(pick('record_review')?.rate_per_hour) ??
    num(pick('file_review')?.rate_per_hour) ??
    num(pick('report_writing')?.rate_per_hour) ??
    FALLBACK_RATES.hourlyRate

  const depositionHourly =
    num(pick('deposition_testimony')?.rate_per_hour) ?? hourlyRate

  const court = pick('court_appearance')
  const trialRate =
    num(court?.daily_rate) ?? num(court?.rate_per_hour) ?? FALLBACK_RATES.trialDayRate

  return {
    hourlyRate,
    depositionRate: depositionHourly * STANDARD_TERMS.depositionMinimumHours,
    trialRate,
    retainerAmount: STANDARD_TERMS.retainerAmount,
    cancellationFeeHours: STANDARD_TERMS.cancellationFeeHours,
    paymentTermsDays: STANDARD_TERMS.paymentTermsDays,
  }
}

/**
 * Standard scope of engagement.
 *
 * Deliberately generic, and it must stay that way. A retention agreement is
 * routinely discoverable, so it must never recite the patient, the procedure,
 * the injury alleged, or a theory of liability — that would put the Expert on
 * record adopting counsel's framing before reviewing a single record, and hands
 * opposing counsel a cross-examination exhibit. Case specifics belong in the
 * case file, never in the agreement.
 */
export const STANDARD_SCOPE =
  'Professional services as an anesthesiology expert witness including: case review and analysis, ' +
  'preparation of written reports or affidavits, participation in telephone or video conferences, ' +
  'depositions, and testimony at trial or other proceedings. Expert serves as independent contractor.'

/** Remittance payee, as it appears on the agreement. */
export const REMITTANCE_PAYEE = 'Mark Ettinger, M.D.'

/** Remittance address printed alongside the payee. */
export const REMITTANCE_ADDRESS = '1115 Oakbrook Hills Ct, Roanoke, TX 76262'
