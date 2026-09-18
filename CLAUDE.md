# boxcomponents

Coordinate-based layout library for React. `npm run check` is the only verification command — it runs oxlint (type-aware), oxfmt, tsc, and vitest in order. Never run those tools individually, never `npm run build` unless shipping.

## Code rules

- Use zod at every external boundary; no hand-rolled validators.
- `useEffect` is forbidden unless there's no alternative (browser observers, document-level listeners are the exceptions).
- Use `undefined`, not `null`, for absent values unless an API forces `null`.
- Reuse exported types instead of redeclaring inline unions.
- Don't comment interface fields unless genuinely ambiguous; comments are a code smell.
- Tests are written before the change they verify, run to confirm they fail, then the source changes. Delete tests whose guarded behavior is gone.
