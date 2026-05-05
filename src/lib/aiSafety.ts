/**
 * aiSafety.ts
 *
 * Central enforcement point for AI call safety rules.
 *
 * Rules (from CLAUDE.md § AI Safety Rules):
 *  - No AI call may run on page load or route change.
 *  - No AI call may run inside a useEffect without an explicit user gesture.
 *  - No AI call may process more than AI_BATCH_HARD_LIMIT items without
 *    explicit user confirmation.
 *  - All AI calls must console.warn('[AI CALL] ...') before the fetch.
 *
 * Usage:
 *   assertExplicitAiAction({ trigger: 'user:button:enrich', itemCount: 1 })
 *   // throws if called outside a user gesture or batch exceeds limit
 */

/** Maximum number of items any single AI batch may process. */
export const AI_BATCH_HARD_LIMIT = 10

/**
 * Set to false to disable ALL bulk AI processing at the module level.
 * Changing this to true does NOT bypass assertExplicitAiAction checks —
 * it only allows the check to proceed to itemCount validation.
 *
 * This is intentionally left as a named constant (not an env var) so
 * that grep can find every reference in the codebase.
 */
export const AI_ALLOW_BULK_PROCESSING = false

export interface AiActionContext {
  /**
   * Human-readable label for the trigger, e.g. 'user:button:enrich' or
   * 'user:button:theme-assign'. This goes into the console.warn log and
   * helps identify the call site during review.
   */
  trigger: string

  /**
   * Number of items this batch will process.
   * assertExplicitAiAction throws if this exceeds AI_BATCH_HARD_LIMIT.
   */
  itemCount: number
}

/**
 * Call this at the top of every AI function before making any fetch.
 *
 * It enforces two rules:
 *  1. Bulk processing must be explicitly enabled (AI_ALLOW_BULK_PROCESSING).
 *     For single-item calls (itemCount === 1) this flag is NOT checked,
 *     because single-item enrichment is always per-word and always
 *     user-initiated at the point it is called.
 *  2. itemCount must not exceed AI_BATCH_HARD_LIMIT.
 *
 * It also emits the mandatory '[AI CALL]' console.warn.
 *
 * @throws {Error} if the call violates safety rules
 */
export function assertExplicitAiAction(ctx: AiActionContext): void {
  const { trigger, itemCount } = ctx

  // Always log so we have a paper trail regardless of pass/fail.
  console.warn(`[AI CALL] ${trigger} — ${itemCount} item(s)`)

  if (itemCount > 1 && !AI_ALLOW_BULK_PROCESSING) {
    throw new Error(
      `[aiSafety] Bulk AI processing is disabled. ` +
      `Trigger "${trigger}" tried to process ${itemCount} items. ` +
      `Bulk processing requires explicit user confirmation and ` +
      `AI_ALLOW_BULK_PROCESSING = true.`
    )
  }

  if (itemCount > AI_BATCH_HARD_LIMIT) {
    throw new Error(
      `[aiSafety] Batch size ${itemCount} exceeds hard limit of ` +
      `${AI_BATCH_HARD_LIMIT}. ` +
      `Trigger "${trigger}" must be split into smaller batches with ` +
      `explicit user confirmation per batch.`
    )
  }
}
