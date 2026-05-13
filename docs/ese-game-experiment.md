# ESE Game Beta Experiment

The ESE game is an optional beta feature inside the existing EngSpeakEng app.
It must not replace the production dashboard, navigation, vocabulary coach, or
AI-powered flows.

## Entry Point

The experiment code lives under:

```text
src/experiments/ese-game/
```

The direct experiment route is:

```text
/__experiments/ese-game
```

The route is gated by:

```text
VITE_ENABLE_ESE_GAME_EXPERIMENT === "true"
```

When the flag is enabled at build time, the dashboard can show the beta entry
card and the direct experiment route renders the ESE game. When the flag is
missing or any value other than `"true"`, the dashboard beta card is hidden and
the direct route shows a lightweight disabled message.

## Vercel Environments

ESE can be enabled in Vercel Preview or Production only when intentionally set:

```text
VITE_ENABLE_ESE_GAME_EXPERIMENT=true
```

Do not set this variable accidentally in Production. If it is not set, the main
production app remains the default experience and the ESE beta is not exposed
from the dashboard.

## Safety Boundary

The route gate is in `src/main.tsx`, before the production `App` is mounted.
The ESE page is lazy-loaded only when the user visits `/__experiments/ese-game`
and the feature flag is enabled.

The experiment must remain isolated from production app state. It must not
import these production modules:

```text
src/App.tsx
src/lib/db.ts
src/store/vocabStore.ts
src/store/gamificationStore.ts
src/store/onboardingStore.ts
src/store/themesStore.ts
```

It must not read from or write to:

```text
IndexedDB: SpeakEnglishDB
localStorage: speak-english-*
localStorage: ese-challenge-session
localStorage: focus-week-start
```

It must not call production API routes or external AI APIs unless a future
change is explicitly reviewed against the app's AI/API safety requirements.

## Data Sources

The beta uses static JSON vocabulary assets only:

```text
/data/migration-vocab.json
/data/starter-packs/index.json
/data/starter-packs/*.json
```

Do not modify production vocabulary JSON files as part of ESE gameplay changes.

## Storage

ESE persistence is experiment-local and limited to localStorage keys with this
prefix:

```text
ese-game-experiment:
```

Current keys:

```text
ese-game-experiment:sentence-repair-progress
ese-game-experiment:phrase-upgrade-progress
ese-game-experiment:recall-challenge-progress
ese-game-experiment:mission-control-state
ese-game-experiment:daily-training-session
```

## Navigation

ESE is optional. It should appear only as a beta entry point when
`VITE_ENABLE_ESE_GAME_EXPERIMENT=true`.

The main route `/` must continue to render the existing EngSpeakEng dashboard.
Existing routes and navigation must not redirect to, or be replaced by, the ESE
experiment.
