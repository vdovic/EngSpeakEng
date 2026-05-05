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

## Development Behaviour

Before large UX or architecture changes:

1. Check this file.
2. Preserve the core learning loop.
3. Prefer small coherent improvements over large unfocused redesigns.
4. Keep existing routes and data compatible unless explicitly instructed otherwise.
5. Run TypeScript and build checks before finalising changes.
