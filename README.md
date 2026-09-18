# boxcomponents

Coordinate-based declarative layout for React. Instead of flow layout and CSS, every box is placed with explicit coordinates and sizes — like Unity's `RectTransform` or QML — and reads its parent's size through a hook.

```tsx
import { Box, BoxRoot, useParentBoxProps } from "boxcomponents";

function SplitBar() {
  const parentProps = useParentBoxProps();
  const width = resolvedAxis(parentProps.size.x);
  return (
    <>
      <Box position={{ x: 0, y: 0 }} size={{ x: width / 2, y: 5 }} />
      <Box
        stackMode="horizontal"
        position={{ x: 0, y: 0 }}
        size={{ x: width / 2, y: 5 }}
        overflow={{ x: "clip", y: "scrollbar" }}
      />
    </>
  );
}

function App() {
  return (
    <BoxRoot style={{ width: "100vw", height: "100vh" }}>
      <SplitBar />
    </BoxRoot>
  );
}
```

## Components

### `<BoxRoot>`

The bridge from normal CSS layout into the coordinate system. It fills its container (override with `style`), measures itself with a `ResizeObserver`, and provides its pixel size to descendants. Children render only after the first measurement, so `useParentBoxProps` always returns a real size. Every `Box` tree must be inside a `BoxRoot`.

### `<Box>`

An absolutely positioned rectangle.

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `position` | `{x, y}` | required | Offset from the attach point, in pixels. +x is right, +y is down. |
| `size` | `SizeSpec` | `"childTotals"` | Width and height. Plain pixels, child-driven, or a function of the child totals — see below. Omitted, the box hugs its children — content-hugging is the default; fixed sizes are the deliberate choice. |
| `relativeTo` | `"parent" \| "siblings"` | `"parent"` | What this box positions against: the parent's interior, or the **previous sibling's rectangle**. |
| `pivot` | `{from?, to?}` | `topLeft`/`topLeft` | `from` is the point on the reference (parent or previous sibling) that `position` is measured from; `to` is the point on **this box** that lands there. |
| `stackMode` | `"vertical" \| "horizontal" \| "verticalReverse" \| "horizontalReverse"` | — | Shorthand for the common sibling pivots: `vertical` stacks below the previous sibling, `horizontal` to its right, the `Reverse` forms above and to the left (gaps there are negative offsets, since +x/+y stay right/down). Implies `relativeTo="siblings"`. Cannot be combined with `pivot`. |
| `overflow` | `{x?, y?}` | `visible` | Per-axis: `"visible"`, `"clip"`, or `"scrollbar"`. A `scrollbar` axis also contains scroll chaining (`overscroll-behavior: contain`), so reaching the end of the scroll never scrolls whatever is outside the box. |
| `border` | `{width, color?, style?}` | — | Border in pixels, drawn inside the declared `size` (border-box). Set borders here, not via `style`, so the library can account for them. |
| `style` | `PaintStyle` | — | Paint-only styles: background, radius, shadow, opacity, outline, cursor, filter, transition, … Layout-flavored CSS (padding, margin, display, width, transform) is a type error here. |
| `dangerousPositionStyles` | `CSSProperties` | — | The deliberate escape hatch: raw CSS merged **after** the computed layout, so it can override anything — transforms, padding, even left/top. The name is the confirmation dialog. |

To align content inside a box, don't reach for CSS — nest an intrinsically sized `Text` (or a `Box`) and pivot it: `pivot={{ from: "center", to: "center" }}` centers it, `pivot={{ from: "centerLeft", to: "centerLeft" }}` vertically centers it against the left edge, and so on. Positioning inside a box is the same mechanism as positioning the box itself.

`Pivot` is one of `topLeft`, `topCenter`, `topRight`, `centerLeft`, `center`, `centerRight`, `bottomLeft`, `bottomCenter`, `bottomRight`.

#### Sibling-relative placement

With `relativeTo="siblings"` a box attaches to the rectangle of the sibling rendered just before it (in JSX order), instead of to the parent. The first such box has no predecessor and attaches to a zero-size rectangle at the parent's origin, so a stack starts wherever its first member's `position` says. `stackMode` is the concise form, with `position` acting as the gap:

```tsx
<Text stackMode="vertical" position={{ x: 12, y: 12 }}>{`First row`}</Text>
<Text stackMode="vertical" position={{ x: 0, y: 8 }}>{`8px below the first`}</Text>
<Text stackMode="vertical" position={{ x: 0, y: 8 }}>{`8px below the second`}</Text>
```

For anything beyond straight stacks, spell out the pivots — this puts a box to the right of its previous sibling, top-aligned, with a 10px gap:

```tsx
<Box relativeTo="siblings" pivot={{ from: "topRight", to: "topLeft" }} position={{ x: 10, y: 0 }} ... />
```

Sibling rectangles come from the same registration channel as `childTotals`, so stacked siblings settle one layout pass after they first render, and re-settle when any member moves or resizes — remove a box from the middle of a stack and the rest close ranks.

#### Child-driven sizing

`size` accepts, besides plain `{x, y}` pixels:

```tsx
<Box size="childTotals" ... />                                // both axes wrap the children
<Box size={{ x: 10, y: "childTotals" }} ... />                // fixed width, height wraps
<Box size={(xt, yt) => ({ x: xt + 1, y: yt + 2 })} ... />     // any function of the totals
```

A child total is the extent of the direct child `Box`es on that axis: from the outermost edge of the upmost/leftmost child to the outermost edge of the downmost/rightmost one (raw text and non-`Box` elements don't count). Children report their rectangles up through context as they render, so a child-driven box resolves its pixel size one layout pass after its children appear, and re-resolves whenever they move or resize.

**The recursion rule:** a child-driven axis is sized *by* its children, so its children cannot ask for its size — that's a cycle. On such an axis, `useParentBoxProps()` returns the string `"childTotals"` instead of a number (so `size` is typed `number | "childTotals"` per axis; the `resolvedAxis(value, fallback?)` helper narrows it when you know it's numeric). `pivot.from` anchoring still works inside child-driven boxes, since the box resolves real pixels internally.

Centering a box on its parent, regardless of either one's size:

```tsx
<Box pivot={{ from: "center", to: "center" }} position={{ x: 0, y: 0 }} size={{ x: 200, y: 100 }} />
```

### `<Text>`

A `Box` that also swallows the text-specific CSS into a structured `font` prop, so labels never need raw `style` typography:

```tsx
<Text
  pivot={{ from: "bottomRight", to: "bottomRight" }}
  position={{ x: -16, y: -16 }}
  font={{ size: 13, color: "#5f6368" }}
>
  {`pinned to bottomRight`}
</Text>
```

`font` takes `family` (defaults to `system-ui, sans-serif`), `size` (px), `weight`, `color`, `lineHeight`, `letterSpacing`, `align` (`"left" | "center" | "right"`, how wrapped lines align within the width), and `style` — one of `"bold"`, `"italic"`, `"underline"`, `"strikethrough"`, or an array combining them (an explicit `weight` wins over `"bold"`). All other `Box` props work on `Text`.

Unlike `Box`, `Text`'s `size` is optional per axis, because text has an intrinsic size:

| `size` | Behavior |
| --- | --- |
| omitted | Intrinsic: as wide as the text wants, but never wider than the parent — short text is one line, long text wraps. With a left `to`-pivot it wraps at the parent's right edge; with a center/right `to`-pivot it sizes to its content (capped at the parent's full width), so pivot alignment is exact. Height is intrinsic. |
| `{ x }` | Lines wrap at `x`; the box grows as tall as the lines need. |
| `{ y }` | Height is fixed at `y`; the text finds the narrowest width whose wrapped lines still fit in `y` (nothing spills on x — the box is exactly as wide as those lines). |
| `{ x, y }` | Wraps at `x` like above, but height is fixed; extra lines overflow on y and the `overflow` rule decides what happens to them. |

Intrinsically sized text measures itself in the browser (a `ResizeObserver`, plus a pre-paint width search for the `{ y }` case), so it still registers correct rectangles with a `childTotals` parent — an auto-sized panel wraps unmeasured labels correctly. Absolutely positioned child `Box`es never contribute to a `Text`'s intrinsic size; only its text content does.

### `useParentBoxProps(options?)`

Returns `{ size: {x, y} }` for the nearest enclosing `Box` (or `BoxRoot`). Throws outside of one.

By default `size` is the parent's declared outer size. A border is drawn inside that rectangle, so a bordered parent's usable interior — the coordinate space its children actually position in — is smaller by `2 × border.width` per axis. Pass `{ countBorder: true }` to get that inner size instead:

```tsx
const { size } = useParentBoxProps({ countBorder: true })
```

Child `Box` anchor math (`pivot.from` against the parent) always uses the inner size, matching where CSS actually resolves the coordinates.

## Props at a glance

`<Box>`:

- `position: { x, y }` — required. Pixel offset from the attach point; +x right, +y down.
- `size?: { x, y } | "childTotals" | { x: number | "childTotals", y: number | "childTotals" } | (xTotal, yTotal) => { x, y }` — default `"childTotals"`: an unsized box hugs its children.
- `pivot?: { from?: Pivot, to?: Pivot }` — attach points on the reference and on this box. Default `topLeft`/`topLeft`.
- `stackMode?: "vertical" | "horizontal" | "verticalReverse" | "horizontalReverse"` — sibling-stacking shorthand (below / right / above / left of the previous sibling); excludes `pivot`.
- `relativeTo?: "parent" | "siblings"` — what the box positions against. Default `"parent"`.
- `overflow?: { x?: OverflowMode, y?: OverflowMode }` — `"visible" | "clip" | "scrollbar" | "ellipsis"` per axis. Default `visible`. `ellipsis` is for text on the x axis; on y it clips.
- `border?: { width: number, color?: string, style?: "solid" | "dashed" | "dotted" | "double" }`
- `zValue?: unknown` — stacking order among siblings. Numbers sort lowest→highest by default; anything else falls back to string comparison, or to the parent's `zSort`. Boxes without a `zValue` stay in DOM order beneath ranked ones. Pass referentially stable values (module-level consts, not inline object literals).
- `zSort?: (a, b) => number` — comparator the **parent** provides for its children's `zValue`s, enabling arbitrary objects as z values.
- `name?: string` — label shown by the debug inspector.
- `style?: PaintStyle` — paint-only styles (background, radius, shadow, opacity, outline, cursor, filter, transition, …); layout-flavored CSS is a type error.
- `dangerousPositionStyles?: CSSProperties` — raw CSS merged after the computed layout; overrides anything, on purpose, loudly.
- `children?: ReactNode`

`<Text>` — all `Box` props except `size`, plus:

- `size?: { x?: number, y?: number }` — both axes optional; unset axes size from the text itself.
- `font?: { family?, size?, weight?, color?, lineHeight?, letterSpacing?, align?, style? }` — `align` is `"left" | "center" | "right"`; `style` is one of or an array of `"bold" | "italic" | "underline" | "strikethrough"`.
- `baseline?: boolean` — `position.y` names the first line's **baseline** (the line the letters sit on) instead of the box top, so texts of different font sizes given the same y sit on the same line. Computed from canvas font metrics; approximate with exotic fonts or before webfonts load.

`<Image>` — all `Box` props (`size` required), plus:

- `src: string`
- `alt?: string`
- `fit?: "cover" | "contain" | "fill" | "none" | "scaleDown"` — how the image fills the box. Default `"contain"`.

`<Wrap>` — not a box: a rendering strategy for the children of whatever `Box` it sits in. It folds over items, giving each one the measured rectangles of the items before it — the primitive for wrap layouts, masonry, or any sequential placement you compute yourself. Its items are ordinary children of the enclosing `Box` (they count toward its `childTotals`, join its sibling chain, and so on):

- `items: readonly T[]`
- `render: (item, { index, prior, parentSize }) => ReactNode` — `prior` is the ordered list of already-measured `ChildRect`s for items before this one; `parentSize` is the enclosing box's inner pixel size. Each render should return one positioned element (wrap multi-part items in a single `Box`).

`<Inset>` — floats inside a `Text`'s content so the words flow around it; it lives in the text flow, **not** the coordinate system (no `position`/`pivot`, doesn't register a rect):

- `size: {x, y}` (required), `side?: "left" | "right"` (default left), `margin?: number` (default 8)
- `src?`/`alt?`/`fit?` for an image inset, or arbitrary `children`.

`<BoxRoot>`:

- `debug?: boolean` — enables the debug inspector. Default `false`.
- `zSort?: (a, b) => number` — comparator for its direct children's `zValue`s.
- `style?: CSSProperties`
- `children?: ReactNode`

### Hooks

- `useParentBoxProps(options?)` — the parent box's size (see above).
- `useParentScroll()` — `{ offset: {x, y} }`, the live scroll offset of the nearest enclosing box. Non-scrolling parents report `{0, 0}`. Position a child at `y: base + offset.y` to pin it while content scrolls (sticky).

## Debug mode

```tsx
<BoxRoot debug>...</BoxRoot>
```

Off by default. With `debug` on, **Ctrl/Cmd+Shift+D** toggles an inspector panel (nothing else changes until you open it). The panel closes with its ✕ and drags by its header when it's covering something.

- Checkboxes outline every `Box` (blue) and every `Text` (magenta) so you can see where the rectangles actually are, and a third toggle highlights **dead space** — fixed-size boxes noticeably larger than their children's extent get red hatching, the tell-tale of a guessed height that should probably be `childTotals`.
- Click any element to select it (red outline). The panel identifies it — the `name` prop if you set one, otherwise its text content for string labels, plus the React instance id — and shows its layout props (`position`, `size`, `pivot`, `relativeTo`, `stackMode`, `overflow`, `border`) as JSON. Give the boxes you expect to debug a `name`; it's the greppable link back to the code.
- Edit the JSON and hit **Apply** to inject the values into the live page; the element re-lays-out immediately, and everything that depends on it (stacked siblings, `childTotals` parents) follows. **Clear override** restores the real props.

Overrides are validated (bad JSON or wrong shapes show an inline error and change nothing), live only in memory, and never touch your code — reload and they're gone. A function-form `size` shows as `"(function)"` in the snapshot; applying it unchanged keeps the function, and replacing it with a concrete value overrides it.

## How positioning works

Each `Box` renders a `position: absolute` div. CSS resolves absolute coordinates against the nearest *positioned* ancestor — and because every `Box` is itself absolutely positioned, each `Box` is the containing block for the boxes inside it. The coordinate chain therefore follows the `Box` nesting with no extra wrappers. `BoxRoot` is `position: relative` to anchor the outermost boxes.

Two things to keep in mind:

- Don't put your own `position: relative/absolute/fixed` element between a `Box` and its children's `Box`es — it would capture their coordinates. Plain (static) wrappers are fine.
- Absolute children resolve against the parent's *padding box* (inside its border). Use the `border` prop rather than `style.border`: the library subtracts it from the anchor math and from `useParentBoxProps({ countBorder: true })`, while a border smuggled in via `style` is invisible to it.
- CSS coerces `overflow: visible` on one axis to `auto` when the other axis is `clip`/`scrollbar`, so `{ x: "visible", y: "scrollbar" }` clips on x anyway. This is a browser rule, not a library choice.

## Development

```
npm install
npm run check   # oxlint + oxfmt + tsc + vitest
npm run dev     # serve the example app (example/) with Vite
npm run build   # emit dist/
```

The `example/` directory is a small Vite app exercising every feature of the library. It has three tabs (the tab bar itself is built from `Box`es with a `childTotals` wrapper): **Demos**, where each card carries a caption naming the features it shows; **CSS recipes**, familiar patterns rebuilt with coordinates — navbar (space-between), holy-grail layout, a 1fr-column card grid, media object, hero overlay, corner badge with tooltip, and a percentage progress bar, each card labeling the CSS it replaces, all flowed onto rows by `<Wrap>` (grid auto-flow) inside a scrollable box; and **Playground**, a full-screen dashed canvas backed by the empty `example/Playground.tsx` — put your own boxes there and hot reload renders them inside it. The demos:

- **TopBars** — the split bars from the snippet above: `useParentBoxProps` plus `resolvedAxis`, sizes derived from the root.
- **Playfield** — bouncing sprite images driven by a `requestAnimationFrame` loop. Shows the payoff of positions being plain data: every frame it computes each sprite's nearest neighbor and the overall closest pair straight from the `position` values — no `getBoundingClientRect` — and renders the distances as labels that track the sprites.
- **CenteredCard** — pivot-pair anchoring to the right edge, `border` with `countBorder`, per-axis `overflow` (`clip` + `scrollbar`), row labels vertically centered by pivoting intrinsic `Text` (`pivot={{ from: "centerLeft", to: "centerLeft" }}`).
- **AutoPanel** (left column, below the playfield) — sibling stacking and child-driven sizing together: every row is `stackMode="vertical"` with `position` as the gap (no manual y math anywhere), and the panel itself uses the function form (`(xt, yt) => ({ x: xt + 24, y: yt + 24 })` for 12px padding). Its chip shelf covers the rest: a `size="childTotals"` strip of horizontally stacked chips, then a `size={{ x: 40, y: "childTotals" }}` column placed beside it with an explicit sibling pivot pair (`relativeTo="siblings" pivot={{ from: "topRight", to: "topLeft" }}`), both wrapped in a `childTotals` box so the row below stacks under the taller of the two. Rows sample every `font.style`, the title uses `letterSpacing`, one paragraph wraps at `size={{ x: 180 }}` with `align: "center"` and `lineHeight`, one text fits `size={{ y: 42 }}` by finding its own width, and one row prints what `useParentBoxProps` reports inside a child-driven box — the literal string `childTotals`.
- **CornerBadge** — a `Box` pinned to the bottom-right corner that auto-fits its label: function-form `size` adds padding around the intrinsic `Text` inside it.
