# Release Checklist

Use this before every significant change, before pushing to production, and before marking a stable release.

---

## 1. TypeScript & build

```bash
npx tsc --noEmit        # must be clean (zero errors)
npm run build           # must succeed
```

Chunk-size warnings are acceptable. Errors are not.

---

## 2. Core flow smoke test

Run through these manually before every release:

| # | Flow | Expected result |
|---|---|---|
| 1 | Add a new word via Quick Add | Word appears in Library with `level: 0` |
| 2 | AI enrichment runs | Definition, synonyms, example populated within a few seconds |
| 3 | AI enrichment retry | Clicking Retry on a failed item re-triggers enrichment |
| 4 | Add word to My Current Focus | Star appears; count in `/week` increases |
| 5 | Open Daily Challenge | Session loads; challenge exercises show correct types |
| 6 | Answer challenge correctly | Exposure count increments; level may advance |
| 7 | Log real-life usage | Usage log appears on item detail page |
| 8 | Stats page loads | Charts render; no blank panels |
| 9 | Onboarding / Adjust profile | All 5 steps work; focus set is updated |
| 10 | Settings → Export | JSON file downloads |
| 11 | Settings → Import | Preview shows, import completes without data loss |
| 12 | Settings → Validate | Issues list appears (or "Library looks healthy") |
| 13 | Settings → Diagnostics | ese-diagnostics-*.json downloads |
| 14 | Settings → About | Version, phase, build date shown |
| 15 | Library filters | Level, focus, exposure band, theme filters all work |
| 16 | Library sort | All sort options produce sensible ordering |
| 17 | Item detail | Opens correctly; editing fields saves |
| 18 | Themes page | Theme cards load; Theme detail shows member words |
| 19 | Review page | SRS due items shown; reviewing updates nextReviewAt |
| 20 | Error boundary | Triggering a render crash shows the recovery screen |

---

## 3. Mobile layout check

- Open on a phone (or DevTools responsive mode, 390 × 844)
- Bottom nav bar visible and tappable
- No horizontal scroll on any page
- Safe-area insets respected (home bar not hidden)
- Buttons are large enough to tap comfortably
- Modals fit the screen and can be dismissed

---

## 4. Export a backup before risky changes

```
Settings → Export → Download backup
```

Keep the file safe. If a migration or import goes wrong, this is your recovery.

---

## 5. Vercel deployment

After pushing to `main`:

1. Check Vercel dashboard for build status.
2. Open the production URL.
3. Hard-refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`) to clear any cached bundle.
4. Repeat smoke tests 1–5 on production.

If the Vercel build fails:
- Check the build log for missing env vars or module resolution errors.
- Verify `VITE_BUILD_DATE` is set if you use it.

---

## 6. Confirm commit hash

```bash
git log --oneline -3
```

Record the exact hash in your release notes or changelog.

---

## 7. Tag stable release (optional)

If this is a significant milestone:

```bash
git tag v0.10.0
git push origin v0.10.0
```

---

## 8. Post-release sanity

- IndexedDB migration did not wipe data for existing users.
- No new TypeScript errors introduced.
- No console errors on a clean load.
- App version shown in Settings matches the release.
