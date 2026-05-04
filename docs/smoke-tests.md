# Manual Smoke Tests

Quick confidence check — run these after any significant change.
Each test should take under 2 minutes total.

---

## ST-01 · App loads

**Steps:**
1. Open the app URL in a clean tab (or hard-refresh).

**Expected:**
- Loading spinner shows briefly, then Dashboard appears.
- No console errors on a clean load.
- NavBar visible (sidebar on desktop, bottom bar on mobile).

---

## ST-02 · Library loads

**Steps:**
1. Navigate to `/library`.

**Expected:**
- Words list renders.
- If library is empty: "Add your first word" prompt shown.
- Level filter pills and sort dropdown are visible and functional.

---

## ST-03 · Add a word

**Steps:**
1. Click the `+` Quick Add button (top right on Dashboard or Library).
2. Type a new word, e.g. "meticulous".
3. Click Save.

**Expected:**
- Word appears in Library with level badge "New".
- AI enrichment status shows "pending" then resolves (or "Retry" if API unavailable).
- No console errors.

---

## ST-04 · Daily Challenge starts

**Steps:**
1. Navigate to `/challenge`.
2. Check the preview list has at least one word (or add one manually).
3. Click "Start challenge".

**Expected:**
- First exercise renders (Recognition / Definition Choice / Fill Gap etc.).
- Answering a question advances to the next one or to the results screen.
- Exposure count increments on a correct answer.

---

## ST-05 · My Current Focus

**Steps:**
1. Navigate to `/week`.
2. If empty: add a word from Library using the star icon.

**Expected:**
- Focus list shows the word.
- Focus count in header matches the star count in Library.

---

## ST-06 · Stats page loads

**Steps:**
1. Navigate to `/stats`.

**Expected:**
- Charts render (level distribution, exposure bands).
- Goal progress card shows.
- No blank panels or JavaScript errors.

---

## ST-07 · Settings — Export

**Steps:**
1. Navigate to `/settings`.
2. Click "Download backup".

**Expected:**
- JSON file named `vocab-backup-YYYY-MM-DD.json` downloads.
- File contains valid JSON with an `items` array.

---

## ST-08 · Settings — Import

**Steps:**
1. In Settings, click the import file zone.
2. Select the file downloaded in ST-07.

**Expected:**
- Preview panel shows Added / Updated / Skipped counts.
- Clicking "Import safely" completes without errors.
- Library item count is unchanged (all words already existed).

---

## ST-09 · Settings — Validate

**Steps:**
1. In Settings, click "Check library".

**Expected:**
- Either "Library looks healthy" or a list of issues.
- Severity badges (Error / Warning / Info) are coloured correctly.
- No crash.

---

## ST-10 · Settings — About & Diagnostics

**Steps:**
1. Scroll to the About and Diagnostics sections in Settings.

**Expected:**
- Version number, phase, and build date are shown.
- "Download report" button downloads `ese-diagnostics-YYYY-MM-DD.json`.
- Report contains library counts but no vocabulary text.

---

## ST-11 · Onboarding / Adjust profile

**Steps:**
1. On Dashboard, click "Adjust my profile" (or trigger onboarding reset).

**Expected:**
- Modal opens at Step 1 (Goal).
- All 5 steps advance correctly.
- Completion step shows and closes the modal.

---

## ST-12 · Error boundary

**Steps:**
(Dev only — skip in production manual testing)

1. In `src/App.tsx` temporarily throw an error inside `DashboardPage`.
2. Load the app.

**Expected:**
- Recovery screen shows ("Something went wrong").
- "Reload app" button reloads.
- "Export crash info" downloads a JSON without personal data.

---

## Notes

- Run ST-01 through ST-10 after every push to `main`.
- ST-11 and ST-12 only need checking after changes to onboarding or error handling.
- For a full pre-release check, also follow `docs/release-checklist.md`.
