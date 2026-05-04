# Manual Test Checklist — SpeakEnglish

> Run this checklist after every significant change before committing.
> Device targets: desktop Chrome, iPhone Safari (or devtools mobile emulation at 390 px).
> "Pass" = feature behaves as described, no console errors, no visual breakage.

---

## Journey A — Add a Word

| # | Step | Pass? |
|---|------|-------|
| A1 | Tap **+** (floating add button) → modal opens as bottom sheet on mobile, centred on desktop | |
| A2 | Modal title reads **"Add word"** (not "Add to Inbox") | |
| A3 | Type a term, submit → success badge reads **"saved"** (not "added to Inbox") | |
| A4 | Word appears in Library with status **New** and level badge showing **New** | |
| A5 | Tap the word → Detail page opens, shows the correct term and level badge | |
| A6 | (Optional) AI enrichment spinner appears, then definition/synonyms populate | |
| A7 | If AI fails → "Generation failed" banner with Retry button appears; tap Retry → tries again | |
| A8 | Add a duplicate term → friendly error "… is already in your vocabulary." shown | |

---

## Journey B — Build My Current Focus

| # | Step | Pass? |
|---|------|-------|
| B1 | Go to **Vocabulary** (Library) | |
| B2 | Star icon on any word card → word added to My Current Focus | |
| B3 | Banner at top of Library shows **"X / 150 in My Current Focus"** | |
| B4 | Tap banner → navigates to **My Current Focus** page (`/week`) | |
| B5 | Select multiple words via checkboxes → bulk bar appears at bottom | |
| B6 | Bulk "Add to Focus" → count increments; "Remove Focus" → count decrements | |
| B7 | Focus count never exceeds 150; lowest-priority items are evicted when cap is hit | |
| B8 | Filter pill **"In My Current Focus"** on Library shows only focus words | |

---

## Journey C — Daily Challenge

| # | Step | Pass? |
|---|------|-------|
| C1 | Tap **Challenge** tab → preview screen with word list | |
| C2 | Word list shows words in correct order (focus words first, lower exposure first) | |
| C3 | Tap **Start** → first question displays correctly for its challenge type | |
| C4 | **Recognition** challenge: shows 4 definition options, selecting one shows feedback overlay | |
| C5 | Feedback overlay: correct = green, incorrect = red; shows exposure journey dots | |
| C6 | **Familiar words** (exp ≥ 5, no usage logs): usage nudge appears in feedback overlay | |
| C7 | Tapping nudge opens **LogUsageModal**; logging closes modal and returns to challenge | |
| C8 | **Definition-choice** challenge renders correctly (multiple definition tiles) | |
| C9 | **Fill-gap** challenge renders correctly (blank in sentence) | |
| C10 | **Sentence-production** challenge: user types sentence, submits → self-rating appears | |
| C11 | **Real-life-use-check** challenge: shown for words with exp=8; "Yes"/"Not yet" buttons | |
| C12 | Completing session → results screen with per-word exposure progress | |
| C13 | Streak counter increments correctly day-over-day | |
| C14 | Bonus round available after session if unused words exist | |
| C15 | Session resumed correctly after page refresh mid-challenge | |

---

## Journey D — Log Real-Life Usage

| # | Step | Pass? |
|---|------|-------|
| D1 | Open any word detail page → compact strip shows **"X/3 used"** and **"Log use"** button | |
| D2 | Tap "Log use" → **LogUsageModal** opens (bottom-sheet on mobile) | |
| D3 | Modal shows 7 context tiles; default **Conversation** is selected | |
| D4 | Select context, add optional sentence and note, tap **Log use ✓** | |
| D5 | Modal closes; compact strip updates to show incremented usage count | |
| D6 | **Real-life usage** section at bottom of detail page shows the new log entry with context label and time | |
| D7 | At 3 logs: "Activated in real life" message appears | |
| D8 | Star confidence rating (1–5): toggle on/off, label changes (Struggled → Natural) | |
| D9 | Stats page → "Real-life usage" card shows updated **Activated** and **Uses this week** counts | |

---

## Journey E — Check Progress (Stats)

| # | Step | Pass? |
|---|------|-------|
| E1 | Navigate to **Stats** (`/stats`) | |
| E2 | Summary tiles show correct counts: Total / Mastered / In Progress / Focus | |
| E3 | **Learning goal** widget shows goal bar with correct % and days remaining | |
| E4 | Edit goal (target, dates) → progress bar updates | |
| E5 | **Level distribution** section shows bar chart with New / Learning / Familiar / Mastered counts | |
| E6 | **Challenge exposure** section shows 4 bands (0 / 1–2 / 3–7 / 8) | |
| E7 | **Real-life usage** card: Activated / Uses this week / Not yet used counts are correct | |
| E8 | Context breakdown chart visible when at least one usage log exists | |
| E9 | High-exposure (≥5) / zero-use chips list shown in real-life section when applicable | |
| E10 | Empty state (no words started yet): shows "Your journey starts here" prompt | |

---

## Terminology Checks

| # | Location | Expected text |
|---|----------|---------------|
| T1 | Quick Add modal header | "Add word" |
| T2 | Quick Add success badge | `"term" saved` |
| T3 | Starter pack dismiss button | "I'll add them manually" |
| T4 | Starter pack success message | "X words added to your library" |
| T5 | Dashboard hero CTA (when inbox words exist) | "Start learning new words →" |
| T6 | Dashboard hero heading | "X words ready to learn" |
| T7 | Library section divider (new words) | "New · not yet practised" |
| T8 | StatusBadge for status=stable | **Familiar** |
| T9 | StatusBadge for status=activation | **Activating** |
| T10 | Item detail "Move to" button | "Move to Learning →" / "Move to Familiar →" / "Move to Activating →" |
| T11 | Item detail level badge (non-edit) | Level badge (New/Learning/Familiar/Mastered), not old status badge |
| T12 | Stats empty-state prompt | No "Inbox" mention |

---

## Mobile UX Checks (390 px emulation)

| # | Check | Pass? |
|---|-------|-------|
| M1 | Library filter pills wrap without horizontal scroll | |
| M2 | "More filters" panel opens below button, no overflow | |
| M3 | BulkActionBar buttons wrap to 2 rows; no button cut off | |
| M4 | InboxCard action row: "Challenge" and "My Focus" labels hidden on mobile (icons only) | |
| M5 | Daily Challenge feedback overlay: does not extend below screen; scrollable if needed | |
| M6 | LogUsageModal opens as bottom sheet; context grid 2-col; scrolls on small screens | |
| M7 | Item detail page: pb-28 on mobile avoids NavBar overlap | |
| M8 | Stats page 3-col KPI grid readable at 390 px | |
| M9 | No horizontal overflow (no scrollbar) on any screen tested | |

---

## Data Safety

| # | Check | Pass? |
|---|-------|-------|
| DS1 | Fresh install: seed data loads with all fields populated | |
| DS2 | On re-load: `migrateItem()` is idempotent — no duplicate writes | |
| DS3 | Old items (pre-Phase-6): `activation.usageLogs` defaults to `[]`; no errors | |
| DS4 | Failed enrichment: item stays in DB with `generationStatus: 'failed'`; no data loss | |
| DS5 | Import starter pack twice: second import skips existing words (no duplicates) | |
| DS6 | Delete item → removed from Library, removed from focus count, not in challenge pool | |
| DS7 | All usage logs have either `context` or `channel` field; `usagePoints()` counts both | |

---

*Last updated: 2026-05-04*
