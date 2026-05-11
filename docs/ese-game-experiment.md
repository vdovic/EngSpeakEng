# ESE Game Experiment Sandbox

The ESE game sandbox is a local-only development surface for testing game
mechanics without affecting the production vocabulary coach.

## Entry Point

The sandbox lives under:

```text
src/experiments/ese-game/
```

Its route is:

```text
/__experiments/ese-game
```

The route only renders when both conditions are true:

```text
import.meta.env.DEV === true
VITE_ENABLE_ESE_GAME_EXPERIMENT === "true"
```

Enable it locally with:

```text
VITE_ENABLE_ESE_GAME_EXPERIMENT=true
```

## Safety Boundary

The route gate is in `src/main.tsx`, before the production `App` is mounted.
This is intentional. `App` loads the production vocabulary store on mount, so
the experiment must bypass `App` entirely to avoid touching production-shaped
local data.

The sandbox must not import these production modules:

```text
src/App.tsx
src/lib/db.ts
src/store/vocabStore.ts
src/store/gamificationStore.ts
src/store/onboardingStore.ts
src/store/themesStore.ts
```

It also must not call production API routes unless a future experiment is
explicitly reviewed against `docs/ai-safety-checklist.md`.

## Storage Namespaces

The sandbox uses separate storage names:

```text
IndexedDB: ESEGameExperimentDB
localStorage prefix: ese-game-experiment:
```

It must not read from or write to:

```text
IndexedDB: SpeakEnglishDB
localStorage: speak-english-*
localStorage: ese-challenge-session
localStorage: focus-week-start
```

## Navigation and Deployment

The sandbox is not linked from production navigation. It should remain reachable
only by directly opening the experiment URL in local development.

Do not deploy the sandbox route to Vercel as a user-facing feature. Any promotion
from sandbox to product should be implemented as a separate product change with
normal release checks.
