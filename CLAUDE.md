# BoxFlow

Coordinate-based layout library for React. `npm run check` is the only verification command — it runs oxlint (type-aware), oxfmt, tsc, and vitest in order. Never run those tools individually, never `npm run build` unless shipping.

## Code rules

- Use zod at every external boundary; no hand-rolled validators.
- `useEffect` is forbidden unless there's no alternative (browser observers, document-level listeners are the exceptions).
- Use `undefined`, not `null`, for absent values unless an API forces `null`.
- Reuse exported types instead of redeclaring inline unions.
- Don't comment interface fields unless genuinely ambiguous; comments are a code smell.
- Tests are written before the change they verify, run to confirm they fail, then the source changes. Delete tests whose guarded behavior is gone.

## Definition of done for features

Every new or changed feature ships in ONE pass with all three, no exceptions:
1. failing-first tests,
2. a real usage in `example/` (a demo card, panel row, or playfield element that exercises it visibly),
3. README coverage (the feature's section AND the props-at-a-glance list AND the example-rundown bullets if a demo was added).

A feature without an example/ usage is not done. Before finishing any feature
turn, grep `example/` for the new prop/component name and add a demo if the
grep comes up empty.
