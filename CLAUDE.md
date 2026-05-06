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
* real-life usage can accelerate mastery
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
7. **Related words** — flat list (synonyms, antonyms, related entries) + optional graph

**Nuance & Register** must combine both:
- Compact visual signals from `UsageProfile` (formality, frequency, medium, phrase tendency)
- Short text explanation from `item.nuance` (preferred) or `profile.naturalnessHint` (fallback)

Visual-only is too shallow for B2–C1 learning; text-only is harder to scan. Both together is the standard.

**Network diagrams** must be:
- Selective — only shown when `relatedEntries.length >= 4`
- Collapsed by default behind "Explore related words visually" toggle
- Never shown for every word automatically

Display component: `src/pages/ItemDetailPage.tsx`.
Badge helpers: `inlineFormalityBadge` / `inlineFrequencyBadge` (defined inline in ItemDetailPage).

---

## Development Behaviour

Before large UX or architecture changes:

1. Check this file.
2. Preserve the core learning loop.
3. Prefer small coherent improvements over large unfocused redesigns.
4. Keep existing routes and data compatible unless explicitly instructed otherwise.
5. Run TypeScript and build checks before finalising changes.
