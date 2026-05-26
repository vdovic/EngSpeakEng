# EngSpeakEng — Product Guidance for Claude

## Core Identity

This is NOT a flashcard app.

This is a **personal English vocabulary coach** that:

* curates what to learn
* guides daily practice
* encourages real-life usage
* adapts automatically

---

## Core Learning Loop

Library → Candidates → Focus → Challenge → Real-life Use → Progress → Adaptation

Claude must preserve this loop in all suggestions.

---

## Key Concepts

### 1. Focus

Focus is the most important product area.

**My Current Focus is the user's active vocabulary portfolio: a curated and evolving set of words selected from the larger Library, balanced by the system, shaped by the user's goals, and trained through Challenges and real-life usage.**

#### Focus Portfolio

The Focus Portfolio is the broader learning pool:

* can contain around 100–150 relevant words
* shaped by onboarding, themes, Library, and Candidates
* always pre-filled where possible
* continuously evolving
* user can add/remove words instantly

The system should maintain balance automatically:

* approximately 30% new words: 0–1 exposures
* approximately 30% mid-progress words: 2–5 exposures
* approximately 30% advanced words: 6–8 exposures

Do not ask users to manage this balance manually.

#### Active Focus

Active Focus is the visible working set for the user:

* should normally show around 20–25 words
* these are the words the user is actively engaging with now
* selected from the Focus Portfolio by the system (due for challenge, low exposure, high difficulty, matching themes)
* shows progress per word:

  * exposure progress: 0–8
  * real-life usage progress: 0–3 uses

* should be easy to scan and act on

---

### 2. Candidates

Candidates are AI-assisted suggested words.

* dynamic based on user preferences
* user can add them to Focus in one click
* newly added words should normally go to Candidates first
* Candidates should help Focus feel alive and relevant

---

### 3. Challenge

Challenge is the main daily practice activity.

It should be:

* short
* mobile-friendly
* adaptive
* varied but not overwhelming

Rules:

* avoid "Do I recognise this word?" as a challenge exercise
* recognition belongs to selection/curation, not learning
* advanced exercises should only appear after at least 2 exposures

---

### 4. Real-life Use

Real-life use is optional but encouraged.

* user can log real-life usage
* real-life use is the defining criterion for mastery, not just an accelerator
* user may mark a word as mastered manually
* the app should encourage active use without forcing it

---

### 5. Progress

Progress should show trajectory toward the long-term goal.

Long-term goal:

* approximately 1500 words
* around 6 months

Progress should be:

* visible
* motivating
* not overwhelming

Today should show only compact progress indicators.
Full detail belongs on the Progress page.

---

## AI Usage

AI should be helpful but not noisy.

AI is mainly used for:

* generating Candidates
* enriching newly added words or phrases
* helping select the right subset of words for a theme

AI should feel mostly invisible in the UI.

Do not overuse "AI" labels.
Do not make the app feel like an AI gimmick.

Suggested guardrail:

* limit full enrichment of new words/phrases to around 10 per day

---

## UX Principles

Claude must follow these principles:

* reduce decision fatigue
* prioritise daily momentum
* show the next best action
* avoid over-explaining internal logic
* show state, not algorithms
* keep mobile use fast and comfortable
* prefer simple progressive disclosure over dense screens
* keep the user in control while letting the system guide

---

## Navigation Model

Primary navigation:

* Today
* Focus
* Challenge
* Library
* Progress

Secondary navigation:

* Themes
* Review
* Settings

Today is the main landing page.

Today should answer:

"What should I do now?"

---

## Product Personality

Tone and UX should feel:

* intelligent
* encouraging
* minimal

Avoid making the product feel:

* noisy
* childish
* overly gamified
* overly analytical
* like a generic flashcard app

---

## Critical Rules for Claude

When suggesting or implementing features, always ask:

"Does this reduce friction and increase daily learning momentum?"

Claude must not:

* suggest generic flashcard features without adapting them to this product model
* overload the user with configuration
* expose internal balancing logic unnecessarily
* make Library the main daily workspace
* treat recognition as a core challenge exercise
* add major features without checking how they fit the learning loop

---

## Usage Profile

Words may include compact "usage intelligence" signals:

* region (British / American / international)
* formality (informal / neutral / formal / academic / professional)
* spoken vs written tendency
* phrase or collocation dependence
* frequency (very common / advanced-common / rare)
* naturalness hints — short, actionable tips for sounding natural

Usage Profile exists to help learners sound more natural and context-aware, not to overload them with linguistic terminology.

Static data lives in `src/data/usageProfiles.ts`.
The type lives on `VocabItem.usageProfile?: UsageProfile`.
Static fallback: `item.usageProfile ?? USAGE_PROFILES[item.term]`.
Display component: `src/components/UsageProfileCard.tsx`.

Usage Profile must NEVER be generated automatically at runtime.
Extend `src/data/usageProfiles.ts` manually or via offline tooling only.

---

## AI Safety Rules

AI must never run silently.

Strict rules:

* No AI call may run on page load.
* No AI call may run on route/navigation change.
* No AI call may run inside a `useEffect` without an explicit user gesture as the trigger.
* No AI call may process more than 10 items in a batch without explicit user confirmation showing the count.
* All AI calls must log `console.warn('[AI CALL] ...')` with the trigger source and item count.
* Bulk AI processing (enrichment, graph generation, theme assignment) is forbidden unless the user has explicitly pressed a button and seen a count.

Any new AI integration must:

1. Be triggered by an explicit user action (button press, form submit).
2. Show the user what will be processed (e.g. "Enrich 5 words?").
3. Have a hard cap enforced by `assertExplicitAiAction` from `src/lib/aiSafety.ts`.
4. Log via `console.warn('[AI CALL]', ...)` before the fetch.

Claude must never:

* Re-enable `useEtymologyEnricher` or `useRelationshipEnricher` as auto-running hooks.
* Add a `useEffect` that calls any AI endpoint without a user gesture gate.
* Remove or weaken the `assertExplicitAiAction` guard.
* Increase `AI_BATCH_HARD_LIMIT` without explicit instruction.

---

## Word Detail Content Layout

Word detail pages follow this content hierarchy:

1. **Meaning** — part of speech, definition, translations
2. **Examples** — natural example, work example, learner's own sentence
3. **Nuance & Register** — compact visual usage signals + short text explanation
4. **Collocations & Phrase Patterns** — collocations, sentence frames, related phrases
5. **Practice / Real-life use** — real-life challenge prompt + usage logs
6. **Etymology** — origin note + memory cue
7. **Related words** — network diagram (when eligible) + navigable text list + synonyms/antonyms

**Nuance & Register** must combine both:
- Compact visual signals from `UsageProfile` (formality, frequency, medium, phrase tendency)
- Short text explanation from `item.nuance` (preferred) or `profile.naturalnessHint` (fallback)

Visual-only is too shallow for B2–C1 learning; text-only is harder to scan. Both together is the standard.

Display component: `src/pages/ItemDetailPage.tsx`.
Badge helpers: `inlineFormalityBadge` / `inlineFrequencyBadge` (defined inline in ItemDetailPage).

---

## Relationship Diagrams

Relationship diagrams are selective, not universal.

They appear only when a word/phrase has at least 4 meaningful relationships (from `relatedEntries` or from `STATIC_RELATIONSHIPS`).

**Layout policy:**
- **≥ 4 relationships** → diagram shown **expanded by default** (no toggle), diagram appears **before** the text related-words list
- **< 4 relationships** → text list only, no diagram
- **0 relationships** → "Build" button for user-initiated AI generation (when no static data exists)

The "Explore visually" toggle is NOT used when static or user data has 4+ entries.

**Data sources (priority order):**
1. `item.relatedEntries` — user/AI-generated entries stored on VocabItem (highest priority)
2. `STATIC_RELATIONSHIPS[item.term]` — static fallback data from `src/data/staticRelationshipEntries.ts`

Static relationship data is generated offline from existing Library fields (synonyms, antonyms, phrasal verb families). It must never be generated at runtime or via AI.

**Static data rules:**
- Static relationship data may be generated offline by `data/migrations/generate-static-relationships.js`
- Each static entry must have at least 4 relationships
- All relationship targets must refer to existing Library items
- The live app must never auto-generate relationship data or call AI in the background
- Static data file: `src/data/staticRelationshipEntries.ts` (DO NOT EDIT BY HAND)

**Do NOT:**
- Re-enable `useRelationshipEnricher` as an auto-running hook
- Add a `useEffect` that generates or fetches relationship data automatically
- Call `/api/relatedEntries` without explicit user action
- Add a toggle/collapse for diagrams when 4+ relationships exist

---

## Development Behaviour

Before large UX or architecture changes:

1. Check this file.
2. Preserve the core learning loop.
3. Prefer small coherent improvements over large unfocused redesigns.
4. Keep existing routes and data compatible unless explicitly instructed otherwise.
5. Run TypeScript and build checks before finalising changes.

---

## Learner Progression Model

Five stages in order: **New → Introduced → Drilling → Activate → Mastered**

* This is the only progression taxonomy shown to learners. Do not introduce a parallel stage system.
* Stages are always derived from live item data at render time. Never store or cache a computed stage value.
* `ItemStatus` (inbox / learning / stable / activation / mastered) is an internal data field. Never display raw status values to learners.
* **Activate** is intentionally a verb, not a noun. It is the only stage requiring action outside the app. Do not normalize it to match the other stage labels.
* Do not add a sixth stage without explicit product discussion.

---

## Activation Philosophy

Activate is categorically different from the other four stages.

* The other four stages represent in-app progress. Activate represents completed in-app training and a requirement for real-world use.
* Activation uses OR logic — any single evidence gate is sufficient to advance to Mastered. Do not change this to AND.
* Do not design the Activate stage to feel like more drills or require more in-app steps. The word is the learner's responsibility now.
* Activate's distinctive visual and label treatment is intentional. Do not normalize it to match the other stages.

---

## Learning and Mastery Philosophy

The goal is active production, not test performance.

* Challenge practice helps the word become familiar. Real-life production proves the word is alive in the learner's vocabulary.
* "Mastered" means the learner can reach for the word naturally — not that they scored well in a challenge.
* Recognition ("Do I know this word?") is curation, not learning. It must not appear as a challenge exercise type.

---

## Gamification Constraints

This product targets adult B2–C1 professional learners. The following patterns actively conflict with their expectations and must not be added:

* Points, XP, scores, or performance ratings
* Streaks
* Achievement badges or unlock animations
* Internal quality labels surfaced to users (e.g. "Strong", "Struggling")
* Leaderboards or social comparison

Progress indicators that show objective state (exposure count, stage, usage count) are encouraged. The distinction is showing *what is true*, not *how good the learner is*.

---

## Language and Terminology

**Stability.** Learner-facing terminology must remain consistent once established. Rename stages, labels, or key actions only with deliberate product rationale. Semantic clarity matters more than novelty or cleverness.

**Boundaries.** Internal system terms (status field values, technical field names such as "ease factor" or "SRS interval") must not appear in primary UI text. Technical data belongs in collapsible panels for curious learners, not in primary views.

**Register.** Write from the learner's perspective. Stage descriptions answer "What does this mean for me right now?" in one calm sentence. Tone is confident and quiet — not celebratory, not urgent.

---

## Architecture Principles

**Derived state is never stored.** Progression stage, canonical level, and any similar derivation must be computed from live item data at render time. Never persist a computed progression value to the database, store, or component state.

**Display components receive live items, not pre-computed values.** Progression badges and indicators accept a `VocabItem` and derive their display internally. This makes stale state architecturally impossible.

**The internal/learner-facing boundary is maintained.** `ItemStatus` is for internal data logic. `DisplayStage` is for what learners see. Do not mix the two surfaces.

---

## Implementation Discipline

* Before committing any progression or state-derivation change: TypeScript must be clean, tests must pass, and the production build must succeed.
* New pure derivation functions need unit tests before being wired to any UI.
* State exact scope before coding. Do not expand scope without explicit approval.
* Systematic migrations are incremental: each phase must leave the codebase clean before the next begins. Legacy and new systems will coexist during migration — this is expected and acceptable.
* Read relevant files before proposing changes. Identify all usage sites before removing or renaming anything.

---

## Accessibility Standards

* Visual indicators that convey stage or status through color alone must have accessible text equivalents (`aria-label`, `title`, or a co-located visible label).
* Color is reinforcement, not the sole carrier of meaning.
* Interactive elements must be clearly distinguishable from informational elements in layout and visual weight.
