/**
 * appVersion.ts — Phase 10
 *
 * Single source of truth for app version, current phase, and build metadata.
 * Import this wherever version info needs to be shown (Settings, diagnostics,
 * error reports, etc.).
 */

export const APP_VERSION = '0.10.0'

export const APP_PHASE = 'Phase 10 — Production Readiness'

/**
 * Build date — set at build time via Vite's import.meta.env if available,
 * otherwise falls back to the compile-time constant injected below.
 * For a fully static build this will be the date the file was last edited.
 */
export const BUILD_DATE: string =
  (import.meta.env.VITE_BUILD_DATE as string | undefined) ?? '2026-05-04'

/** Human-readable one-liner for display in UI */
export function appVersionLabel(): string {
  return `v${APP_VERSION} · ${APP_PHASE} · ${BUILD_DATE}`
}
