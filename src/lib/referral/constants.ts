/** Default commission rate in basis points (2000 = 20%). */
export const DEFAULT_COMMISSION_BPS = 2000;

/**
 * Minimum unpaid balance (cents) before a payout can be created. Matches
 * Terms §10.3 — €50 SEPA minimum to keep payout amount above transfer fees.
 */
export const MIN_PAYOUT_CENTS = 5000; // €50

/** Currency for all referral ledger entries. */
export const REFERRAL_CURRENCY = "eur";

/**
 * Attribution window in days (Terms §10.2). The middleware writes the
 * referral cookie with this TTL; once it expires the user is no longer
 * attributable to the partner. Single source of truth — both the cookie
 * maxAge and any future server-side age check must read this constant.
 */
export const ATTRIBUTION_WINDOW_DAYS = 60;
export const ATTRIBUTION_WINDOW_SECONDS = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60;
