/**
 * AudioLift Pro — Polar lisans sabitleri.
 *
 * Backend yok: Polar'ın auth gerektirmeyen "customer portal" license-key
 * uçları doğrudan background service worker'dan çağrılır. Aynı desen:
 * AdPilot (browser-adpilot/license-config.js) ve Mailskin
 * (browser-mailskin/license-config.js) — bkz. kök BRIEF.md §5.
 *
 * Kurulum kaydı (2026-09-02, Polar org "dagkan-bayramoglu"):
 *   - Product "AudioLift Pro (Monthly)": 1a7c5061-5e98-49d9-b65a-79af6c555071 — $2.99/ay
 *   - Product "AudioLift Pro (Yearly)":  de522345-2e6c-4d8b-a907-caf898bcd7d4 — $19.99/yıl
 *   - Benefit (license_keys, prefix "ALT", 3 aktivasyon): a1c14a2e-3f69-4107-bf2d-3c05697ee9e7
 */
export const LICENSE = {
  ORG_ID: 'b0760693-97ab-4bd8-9367-d61530ea0f69',
  API_BASE: 'https://api.polar.sh/v1/customer-portal/license-keys',
  CHECKOUT_MONTHLY: 'https://buy.polar.sh/polar_cl_LdV4RRc8aczsTe6m5DhI75FjjAGV9sk1tUwUL21EQiy',
  CHECKOUT_YEARLY: 'https://buy.polar.sh/polar_cl_FWAUNh42kI9FsWQ5I3R5ZCb7aOdEJom9V3DFC22SRmM',
  OFFLINE_GRACE_MS: 7 * 24 * 60 * 60 * 1000,
  VALIDATE_ALARM: 'audiolift-license-validate',
  PRICE_MONTHLY: '$2.99/mo',
  PRICE_YEARLY: '$19.99/yr',
} as const;

export type LicenseActivateResult =
  | { ok: true; status: string }
  | { ok: false; error: 'empty' | 'invalid' | 'not-granted' | 'network'; status?: string };

export interface LicenseStorageState {
  licenseKey?: string;
  activationId?: string;
  proActive?: boolean;
  licenseStatus?: 'granted' | 'revoked' | 'disabled' | 'invalid' | 'error' | null;
  lastValidatedAt?: number | null;
}

export const LICENSE_STORAGE_KEYS = [
  'licenseKey',
  'activationId',
  'proActive',
  'licenseStatus',
  'lastValidatedAt',
] as const;

/** Free tier'da açık kalan 5 küratörlü preset — kalan 15'i Pro. */
export const FREE_PRESET_KEYS = ['flat', 'movie', 'music', 'podcast', 'bassboost'] as const;

/** Pro'ya özel QuickTools — Mono her zaman ücretsiz. */
export const PRO_GATED_TOOLS = ['smartVolume', 'loudnessMode'] as const;
