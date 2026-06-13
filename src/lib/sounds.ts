/**
 * sounds.ts — lightweight Web Audio sound effects for the Speed Game.
 *
 * All sounds are generated programmatically via the Web Audio API.
 * No audio files required.  AudioContext is lazily initialised on first
 * call so there's no overhead on pages that don't use sound.
 *
 * Correct: bright two-note ascending chime (G5 → C6)
 * Wrong:   soft descending thud (D4 → A3)
 *
 * Mobile note: AudioContext.resume() is async. getCtxAsync() awaits it
 * before scheduling tones so the context is guaranteed to be running —
 * this is the main reason sound failed on iOS/Android (suspended context).
 *
 * The mute preference is stored in localStorage under ESE_SOUNDS_KEY so
 * it persists across sessions without needing a Zustand store.
 */

export const ESE_SOUNDS_KEY = 'ese-sounds-enabled'

// ── AudioContext (lazy, singleton) ────────────────────────────────────────────

let _ctx: AudioContext | null = null

async function getCtxAsync(): Promise<AudioContext | null> {
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    if (!_ctx || _ctx.state === 'closed') _ctx = new Ctor()
    // Mobile browsers suspend the context until a user gesture.
    // Awaiting resume() ensures the context is running before we schedule tones —
    // fire-and-forget was the reason sounds didn't play on mobile.
    if (_ctx.state === 'suspended') await _ctx.resume()
    return _ctx.state === 'running' ? _ctx : null
  } catch {
    return null
  }
}

// ── Primitive tone builder ────────────────────────────────────────────────────

/**
 * Play a single synthesised tone.
 *
 * @param ac         AudioContext to use.
 * @param freq       Frequency in Hz.
 * @param startSec   Offset from now (seconds).
 * @param durSec     Duration including release (seconds).
 * @param peakGain   Peak amplitude 0–1.  Keep below 0.4 for a pleasant mix.
 * @param type       Oscillator waveform — 'sine' is smoothest.
 */
function tone(
  ac: AudioContext,
  freq: number,
  startSec: number,
  durSec: number,
  peakGain: number,
  type: OscillatorType = 'sine',
): void {
  const osc  = ac.createOscillator()
  const gain = ac.createGain()
  const now  = ac.currentTime

  osc.type = type
  osc.frequency.setValueAtTime(freq, now + startSec)

  // Fast attack → exponential decay
  gain.gain.setValueAtTime(0.0001, now + startSec)
  gain.gain.linearRampToValueAtTime(peakGain, now + startSec + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + startSec + durSec)

  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(now + startSec)
  osc.stop(now + startSec + durSec + 0.02)
}

// ── Public sound effects ──────────────────────────────────────────────────────

/**
 * Bright two-note ascending chime for a correct answer.
 * G5 (784 Hz) → C6 (1047 Hz) — quick and satisfying.
 */
export async function playCorrectSound(): Promise<void> {
  const ac = await getCtxAsync()
  if (!ac) return
  tone(ac, 784,  0.0,  0.13, 0.18)   // G5 — first note
  tone(ac, 1047, 0.09, 0.16, 0.14)   // C6 — second note, slightly quieter
}

/**
 * Soft descending thud for a wrong answer.
 * D4 (294 Hz) → A3 (220 Hz) — clear but not harsh.
 */
export async function playWrongSound(): Promise<void> {
  const ac = await getCtxAsync()
  if (!ac) return
  tone(ac, 294, 0.0,  0.11, 0.22)   // D4 — initial hit
  tone(ac, 220, 0.06, 0.20, 0.16)   // A3 — lower settling tone
}

// ── Mute preference helpers ───────────────────────────────────────────────────

export function getSoundsEnabled(): boolean {
  try {
    return localStorage.getItem(ESE_SOUNDS_KEY) !== 'false'
  } catch {
    return true
  }
}

export function saveSoundsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ESE_SOUNDS_KEY, String(enabled))
  } catch { /* storage unavailable — fine */ }
}
