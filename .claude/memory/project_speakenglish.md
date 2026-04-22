---
name: SpeakEnglish project overview
description: Architecture, stack, and key decisions for the English vocabulary fluency app
type: project
---

Private single-user vocabulary fluency web app. Goal: B2–C1 English for professional Product Owner use.

**Why:** Help user build active vocabulary for meetings, emails, and stakeholder work — not just passive recognition.

**Stack:** Vite + React 18 + TypeScript, Tailwind CSS v3, React Router v6, Dexie.js (IndexedDB), Zustand

**Persistence:** IndexedDB via Dexie — chosen over localStorage for complex structured queries and larger data. Seed data loads on first run.

**Key files:**
- `src/types/vocabulary.ts` — full VocabItem interface, all types
- `src/lib/srs.ts` — spaced repetition (intervals: 0/1/3/7/14/30/60 days, outcomes: again/hard/good/easy)
- `src/lib/mastery.ts` — mastery rule: 3+ recalls + own sentence + 3 real-life uses
- `src/lib/db.ts` — Dexie database class
- `src/lib/seed.ts` — 8 seed vocab items (mitigate, cumbersome, align on, etc.)
- `src/store/vocabStore.ts` — Zustand store wrapping all DB operations
- `src/pages/` — Dashboard, InboxPage, ReviewPage, LibraryPage, ItemDetailPage, ActiveWeekPage, StatsPage
- `src/components/` — NavBar, QuickAddModal, LogUsageModal, VocabCard, StatusBadge, TypeBadge, UsageProgress

**How to apply:** When adding features, follow existing store pattern (Zustand action → Dexie update → set state). Review modes rotate based on reviewCount. Status lifecycle: inbox → learning → stable → activation → mastered.
