# BoxFlow

Coordinate-based layout library for React. `npm run check` is the only verification command — it runs oxlint (type-aware), oxfmt, tsc, and vitest in order. Never run those tools individually, never `npm run build` unless shipping. `npm run visual` is a separate screenshot change detector (headless Chrome, report-only): run it before and after a visual change to see which pixels and named boxes moved.

## Code rules

- Use zod at every external boundary; no hand-rolled validators.
- `useEffect` is forbidden unless there's no alternative (browser observers, document-level listeners are the exceptions).
- Use `undefined`, not `null`, for absent values unless an API forces `null`.
- Reuse exported types instead of redeclaring inline unions.
- Don't comment interface fields unless genuinely ambiguous; comments are a code smell.
- Tests are written before the change they verify, run to confirm they fail, then the source changes. Delete tests whose guarded behavior is gone.

## Components are not boxes

- Only components with "Box" in their name (`Box`, `BoxText`) are boxes and may inherit `BoxBaseProps`. Never make any other component a box by inheriting `BoxBaseProps`/`BoxProps` or rendering a `Box` to pick up its props. Declare exactly the props the component needs; when the user specifies a component's props, those are its props.
- A prop that happens to share a name with a `Box` prop (e.g. `size` on `Image`) is fine when the component itself needs it. The banned thing is the assumption that everything should be a box.
- Content (images, grids, embedded HTML) sizes itself and reports that rectangle to its enclosing `Box` via `useContentRect`; positioning, click handlers, and overlays belong to the `Box` around it.
- Keep the concepts separate in docs too: never suggest skipping a `Box` because another component accepts its props. The plain, obvious usage (`<Box …><Content/></Box>`) is the correct one and must just work.

## Definition of done for features

Every new or changed feature ships in ONE pass with all three, no exceptions:
1. failing-first tests,
2. a real usage in `example/` (a demo card, panel row, or playfield element that exercises it visibly),
3. README coverage (the feature's section AND the props-at-a-glance list AND the example-rundown bullets if a demo was added).

A feature without an example/ usage is not done. Before finishing any feature
turn, grep `example/` for the new prop/component name and add a demo if the
grep comes up empty.
