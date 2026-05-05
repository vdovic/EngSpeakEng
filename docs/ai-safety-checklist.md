# AI Safety Checklist

Use this checklist before any pull request that adds, changes, or re-enables AI-powered functionality.

---

## 1. Trigger — is this explicitly user-initiated?

- [ ] The AI call is triggered by a user gesture (button press, form submit, keyboard shortcut).
- [ ] The AI call is NOT inside a `useEffect` that runs on component mount or on a dependency change that is not a direct user action.
- [ ] The AI call is NOT triggered by navigation (route change, tab switch, page load).
- [ ] There is NO automatic retry logic that fires without user approval.

---

## 2. Scope — does the user know what will be processed?

- [ ] The UI shows the user how many items will be processed **before** the call starts.
- [ ] If more than 1 item: a confirmation step (dialog, count label, or preview) is shown.
- [ ] The user can cancel or dismiss without any AI call being made.

---

## 3. Hard limits

- [ ] `assertExplicitAiAction` from `src/lib/aiSafety.ts` is called at the top of the AI function.
- [ ] `itemCount` passed to `assertExplicitAiAction` matches the actual number of items sent to the API.
- [ ] Batch size does not exceed `AI_BATCH_HARD_LIMIT` (currently 10) per call.
- [ ] If bulk processing is required, `AI_ALLOW_BULK_PROCESSING` is explicitly set to `true` with a comment explaining why.

---

## 4. Logging

- [ ] `console.warn('[AI CALL] ...')` appears before every `fetch` to an AI endpoint.
- [ ] The log message includes: trigger source, term or theme name, item count.
- [ ] The log is emitted by `assertExplicitAiAction` (not a separate manual `console.warn`).

---

## 5. Error handling

- [ ] The AI call has a try/catch or `.catch()` handler.
- [ ] On failure, the UI shows a user-visible error or retry option.
- [ ] On failure, no automatic silent retry loop is started.

---

## 6. Regression guard — disabled hooks

- [ ] `useEtymologyEnricher` is still a null-returning stub (NOT re-enabled).
- [ ] `useRelationshipEnricher` is still a null-returning stub (NOT re-enabled).
- [ ] Neither hook is re-imported in `LibraryPage.tsx` or any other page.
- [ ] `enrichItem` does NOT chain into `generateRelatedEntries` automatically.

---

## 7. CLAUDE.md alignment

- [ ] The new AI feature is consistent with the rules in `CLAUDE.md § AI Safety Rules`.
- [ ] No new `useEffect`-based AI triggers are introduced.
- [ ] The feature fits the core learning loop described in `CLAUDE.md`.

---

## AI endpoints reference

| Endpoint | Called from | Trigger type |
|---|---|---|
| `POST /api/enrich` | `vocabStore.enrichItem()` | Per-word, on `addItem` (single item) |
| `POST /api/relatedEntries` | `vocabStore.generateRelatedEntries()` | Explicit user button on word detail page |
| `POST /api/assignTheme` | `aiThemeAssignment.assignWordsToTheme()` | Explicit "Auto-assign" button on Themes page |
| `POST /api/checkSentence` | `SentenceCreateExercise.tsx` | Explicit "Check" button during Challenge |
| `POST /api/candidates` | candidate generation flow | Explicit user action |

---

## Disabled AI patterns (do not re-enable)

| Pattern | Why disabled | Disabled since |
|---|---|---|
| `useEtymologyEnricher` hook | Auto-processed all 100+ missing-etymology items on Library mount | 2026-05-05 |
| `useRelationshipEnricher` hook | Auto-built word graphs for 1000+ items on Library mount | 2026-05-05 |
| Auto-chain `enrichItem → generateRelatedEntries` | Doubled API calls for every newly added word silently | 2026-05-05 |
| Unbounded stuck-item retry on `load()` | Re-enriched all `pending` items on every app start | 2026-05-05 (capped at 5) |
