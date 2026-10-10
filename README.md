# BoxFlow

Coordinate-based declarative layout for React. Instead of flow layout and CSS, every box is placed with explicit coordinates and sizes — like Unity's `RectTransform` or QML — and reads its parent's size through a hook.

```tsx
import { Box, BoxRoot, useParentBoxProps } from "boxflow";

function SplitBar() {
  const parentProps = useParentBoxProps();
  const width = resolvedAxis(parentProps.size.x);
  return (
    <>
      <Box size={{ x: width / 2, y: 5 }} />
      <Box
        stackMode="horizontal"
        size={{ x: width / 2, y: 5 }}
        overflow={{ x: "clip", y: "scrollbar" }}
      />
    </>
  );
}

function App() {
  return (
    <BoxRoot>
      <SplitBar />
    </BoxRoot>
  );
}
```

## Components

### `<BoxRoot>`

The entry into the coordinate system. By default it **owns the browser window**: `<BoxRoot>` with no props fills the viewport regardless of what the surrounding page's CSS does — no `height: 100%` chains, no viewport units, nothing to set up. It measures itself with a `ResizeObserver` and provides its pixel size to descendants; children render only after the first measurement, so `useParentBoxProps` always returns a real size. Every `Box` tree must be inside a `BoxRoot`.

Two declarative alternatives to window ownership:

- `size={{ x, y }}` — a fixed-pixel root sitting in the normal page flow (a canvas embedded in a document). A missing axis falls back to filling the container.
- `fill="parent"` — the root takes its extent from its CSS container, for embedding a coordinate region inside an existing CSS layout. This is the one place the package leans on surrounding CSS, so the container must actually have a size.

### `<Box>`

An absolutely positioned rectangle.

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `position` | `{x?, y?}` | `{0, 0}` | Offset from the attach point, in pixels. +x is right, +y is down. Each axis is optional and defaults to 0, so `position={{ y: 20 }}` is valid. |
| `size` | `SizeSpec` | hug children | Width and height: `{x?, y?, min?, max?}` or a function of the child totals — see below. Omitted axes hug the children; `min` floors the coordinate space, `max` caps the visual box. Content-hugging is the default; fixed sizes are the deliberate choice. |
| `relativeTo` | `"parent" \| "siblings"` | `"parent"` | What this box positions against: the parent's interior, or the **previous sibling's rectangle**. |
| `pivot` | `{from?, to?}` | `topLeft`/`topLeft` | `from` is the point on the reference (parent or previous sibling) that `position` is measured from; `to` is the point on **this box** that lands there. An unspecified `to` mirrors `from`, so `{from: "center"}` means center-to-center. A bare string sets both: `pivot="center"` ≡ `{from: "center", to: "center"}`. |
| `stackMode` | `"vertical" \| "horizontal" \| "verticalReverse" \| "horizontalReverse"` | — | Shorthand for the common sibling pivots: `vertical` stacks below the previous sibling, `horizontal` to its right, the `Reverse` forms above and to the left (gaps there are negative offsets, since +x/+y stay right/down). Implies `relativeTo="siblings"`. Cannot be combined with `pivot`. |
| `overflow` | `{x?, y?}` | `visible` | Per-axis: `"visible"`, `"clip"`, or `"scrollbar"`. A `scrollbar` axis also contains scroll chaining (`overscroll-behavior: contain`), so reaching the end of the scroll never scrolls whatever is outside the box. |
| `border` | `{width, color?, style?, overlay?, sides?}` | — | Border in pixels. By default it's a weightless overlay **centered on the box edge** (SVG-stroke semantics): it takes no space, so the interior, child coordinates, and `childTotals` are untouched, and the borders of boxes with coincident edges merge into one shared line. `overlay: false` draws it inside the declared `size` instead (border-box), shrinking the interior by `width` per edge. `sides: "bottom"` or `sides: ["top", "left"]` limits the border to those edges — overlay strips paint only there, and an inset border shrinks the interior only on the listed edges. |
| `style` | `PaintStyle` | — | Paint-only styles: background, radius, shadow, opacity, outline, cursor, filter, transition, … Layout-flavored CSS (padding, margin, display, width, transform) is a type error here. |
| `dangerousPositionStyles` | `CSSProperties` | — | The deliberate escape hatch: raw CSS merged **after** the computed layout, so it can override anything — transforms, padding, even left/top. The name is the confirmation dialog. |
| `hover` | `{onEnter?, onLeave?, onMove?}` | — | Pointer-hover handlers on the box's own element, each a `PointerEventHandler`. A box with no handlers attaches no listeners. |
| `onClick`, `onPointerDown`, `onPointerUp` | React handlers | — | Click and press events on the box's own element. While the debug inspector is open, clicks go to the inspector instead of `onClick`. |

To align content inside a box, don't reach for CSS — nest an intrinsically sized `BoxText` (or a `Box`) and pivot it: `pivot={{ from: "center" }}` centers it, `pivot={{ from: "centerLeft" }}` vertically centers it against the left edge, and so on. Positioning inside a box is the same mechanism as positioning the box itself.

`Pivot` is one of `topLeft`, `topCenter`, `topRight`, `centerLeft`, `center`, `centerRight`, `bottomLeft`, `bottomCenter`, `bottomRight`.

#### Sibling-relative placement

With `relativeTo="siblings"` a box attaches to the rectangle of the sibling rendered just before it (in JSX order), instead of to the parent. The first such box has no predecessor and attaches to a zero-size rectangle at the parent's origin, so a stack starts wherever its first member's `position` says. `stackMode` is the concise form, with `position` acting as the gap:

```tsx
<BoxText stackMode="vertical" position={{ x: 12, y: 12 }}>{`First row`}</BoxText>
<BoxText stackMode="vertical" position={{ x: 0, y: 8 }}>{`8px below the first`}</BoxText>
<BoxText stackMode="vertical" position={{ x: 0, y: 8 }}>{`8px below the second`}</BoxText>
```

For anything beyond straight stacks, spell out the pivots — this puts a box to the right of its previous sibling, top-aligned, with a 10px gap:

```tsx
<Box relativeTo="siblings" pivot={{ from: "topRight", to: "topLeft" }} position={{ x: 10, y: 0 }} ... />
```

Sibling rectangles come from the same registration channel as `childTotals`, so stacked siblings settle one layout pass after they first render, and re-settle when any member moves or resizes — remove a box from the middle of a stack and the rest close ranks.

#### Child-driven sizing

`size` accepts, besides plain `{x, y}` pixels:

```tsx
<Box ... />                                                   // both axes wrap the children
<Box size={{ x: 10 }} ... />                                  // fixed width, height wraps
<Box size={(xt, yt) => ({ x: xt + 1, y: yt + 2 })} ... />     // any function of the totals
```

A child total is the **required space** on that axis: each child contributes its reach from the edge it's anchored to (a left-anchored child at `x: 12` with width 50 needs 62; a right-anchored child with a −16 offset and width 200 needs 216), and when a left-anchored and a right-anchored child share a latitude line (their y-ranges overlap), their reaches **add** — that sum is the width below which they'd collide. The total is the widest requirement across all lines; sibling-stacked children inherit the anchor of the chain they hang off. Raw text and non-`Box` elements don't count. Children report their rectangles up through context as they render, so a child-driven box resolves its pixel size one layout pass after its children appear, and re-resolves whenever they move or resize.

#### size.min and size.max — limits instead of collision or unbounded growth

`size.min` doesn't change the box's visual size — it floors the **coordinate space children anchor into**. While the actual size is above the floor, edge-anchored children move with the edges as usual; below it, the space stops shrinking, children stop converging, and the content overflows the visual box for the `overflow` rule to handle. `min: "childTotals"` is CSS's min-content collapse point: shrink freely until things would touch, then scroll/clip instead of overlapping.

The two limits are deliberately asymmetric — `max` caps the box, `min` floors the space:

```
visual box   = min(resolvedSize, max)
anchor space = max(visual box, min)
```

The function form carries its own limits: it may return `{ x, y, min?, max? }` with plain-number limits (you already hold the totals), so calculated sizing and the anchor-space floor compose — `size={(xt) => ({ x: 300, y: xt + 24, min: { x: 260 } })}`.

`size.max` is the other direction: it **caps the visual box**, so a content-hugging box grows with its children only up to the cap, after which content overflows and the `overflow` rule takes over — `size={{ max: { y: 400 } }}` with `overflow={{ y: "scrollbar" }}` is a list that hugs until 400px, then scrolls. Both limits take per-axis numbers or `"childTotals"`.

`BoxRoot` participates: it defaults to `overflow: auto` on both axes (scrollbars appear only when content actually overflows — override with its `overflow` prop) and takes `size={{ min, max }}` limits on its measured space, so a page laid out for 1160px (`size={{ min: { x: 1160 } }}`) gets a horizontal scrollbar below 1160 instead of colliding elements — the standard CSS page behavior.

**The recursion rule:** a child-driven axis is sized *by* its children, so its children cannot ask for its size — that's a cycle. Each axis from `useParentBoxProps()` is a tagged value: `{ kind: "pixels", value: number }` when the parent's size is real, or `{ kind: "childTotals" }` on a child-driven axis. Checking the `kind` enum narrows the type, so there's never a `typeof` in sight:

```tsx
const { size } = useParentBoxProps();
const gap = (size.y.kind === "pixels" ? size.y.value : 0) / rows;
// or, when a fallback is all you need:
const gap = resolvedAxis(size.y) / rows; // pixels value, or 0 (second arg overrides the fallback)
```

`pivot.from` anchoring still works inside child-driven boxes, since the box resolves real pixels internally.

Centering a box on its parent, regardless of either one's size:

```tsx
<Box pivot={{ from: "center" }} size={{ x: 200, y: 100 }} />
```

### `<BoxText>`

A `Box` that also swallows the text-specific CSS into a structured `font` prop, so labels never need raw `style` typography:

```tsx
<BoxText
  pivot={{ from: "bottomRight" }}
  position={{ x: -16, y: -16 }}
  font={{ size: 13, color: "#5f6368" }}
>
  {`pinned to bottomRight`}
</BoxText>
```

`font` takes `family` (defaults to `system-ui, sans-serif`), `size` (px), `weight`, `color`, `lineHeight`, `letterSpacing`, `align` (`"left" | "center" | "right"`, how wrapped lines align within the width), and `style` — one of `"bold"`, `"italic"`, `"underline"`, `"strikethrough"`, or an array combining them (an explicit `weight` wins over `"bold"`). All other `Box` props work on `BoxText`.

Unlike `Box`, `BoxText`'s `size` is optional per axis, because text has an intrinsic size:

| `size` | Behavior |
| --- | --- |
| omitted | Intrinsic: as wide as the text wants, but never wider than the parent — short text is one line, long text wraps. Inside a child-driven (hugging) parent there is no edge to wrap at — the parent is sized by the text — so the text stays one line (`max-content`); a tooltip of unsized text in an unsized box just works. With a left `to`-pivot it otherwise wraps at the parent's right edge; with a center/right `to`-pivot it sizes to its content (capped at the parent's full width), so pivot alignment is exact. Height is intrinsic. |
| `{ x }` | Lines wrap at `x`; the box grows as tall as the lines need. |
| `{ y }` | Height is fixed at `y`; the text finds the narrowest width whose wrapped lines still fit in `y` (nothing spills on x — the box is exactly as wide as those lines). |
| `{ x, y }` | Wraps at `x` like above, but height is fixed; extra lines overflow on y and the `overflow` rule decides what happens to them. |

Intrinsically sized text measures itself in the browser (a `ResizeObserver`, plus a pre-paint width search for the `{ y }` case), so it still registers correct rectangles with a `childTotals` parent — an auto-sized panel wraps unmeasured labels correctly. Absolutely positioned child `Box`es never contribute to a `BoxText`'s intrinsic size; only its text content does.

### `<Embed>`

The bridge for content that isn't part of the component system — native forms, canvases, videos, third-party widgets. A `Box` only sees registered children, so raw HTML dropped inside one is invisible to layout: a hugging parent measures it as zero and stacked siblings attach at zero. `Embed` wraps foreign content in a measured rectangle (a `ResizeObserver`, settled before paint) and registers it, making it a first-class citizen: it counts toward `childTotals`, siblings can stack against it, and `position`/`pivot`/`stackMode` work on it like on any box.

```tsx
<Embed stackMode="vertical" position={{ x: 0, y: 8 }}>
  <form>…</form>
</Embed>
```

`size?: { x?, y? }` fixes an axis while the other stays measured — `size={{ x: 300 }}` is a form constrained to 300px whose height follows its content.

### `<Line>`, `<Polygon>`, and `<Ellipse>`

Shape primitives for the playground/graphics side of layout — connectors, markers, decorations:

```tsx
<Line from={{ x: 20, y: 80 }} to={{ x: 180, y: 20 }} stroke={{ width: 2, color: "#1a73e8", dash: [4, 4] }} />
<Polygon points={[{ x: 56, y: 10 }, { x: 86, y: 40 }, { x: 26, y: 40 }]} fill="#fde293" />
<Ellipse center={{ x: 148, y: 44 }} radius={{ x: 34, y: 22 }} fill="#e8f0fe" />
```

Shapes take the same pointer props as `Box` (`hover={{ onEnter, onLeave, onMove }}`, `onClick`, `onPointerDown`, `onPointerUp`), and hit-test on their actual geometry: the interior and stroke of a polygon or ellipse, the stroke of a line, whether or not they are painted. The rectangular frame around a shape never catches the pointer, so an unfilled ellipse still ignores pointers in its corners. A shape with no handlers is fully inert.

```tsx
<Ellipse center={p} radius={6} fill="#1a73e8" hover={{ onEnter: () => setHovered(i), onLeave: () => setHovered(undefined) }} />
```

Shapes are drawn in the parent's coordinate space and only there: no `relativeTo`, `stackMode`, or `pivot` — a shape's points *are* its position. They also stand outside the layout system entirely: a shape never joins the sibling chain (a stacked `Box` after a `Line` attaches to the previous `Box`) and never contributes to a parent's `childTotals`. Sibling `Box` positions are only affected by other boxes; shapes annotate the space without occupying it.

### `useParentBoxProps(options?)`

Returns `{ size: { x, y } }` for the nearest enclosing `Box` (or `BoxRoot`); each axis is `{ kind: "pixels", value }` or `{ kind: "childTotals" }` (see the recursion rule above). Throws outside of one.

By default `size` is the parent's declared outer size. An `overlay: false` border is drawn inside that rectangle, so such a parent's usable interior — the coordinate space its children actually position in — is smaller by `2 × border.width` per axis. Pass `{ countBorder: true }` to get that inner size instead (for default overlay borders it equals the outer size):

```tsx
const { size } = useParentBoxProps({ countBorder: true })
```

Child `Box` anchor math (`pivot.from` against the parent) always uses the inner size, matching where CSS actually resolves the coordinates. With the default overlay border the inner size *is* the outer size — children anchor to the true rectangle and may paint over the border line.

## Props at a glance

`<Box>`:

- `position?: { x?, y? }` — default `{0, 0}`; an omitted axis is 0 (`position={{ y: 20 }}` works). Pixel offset from the attach point; +x right, +y down.
- `size?: { x?, y?, min?, max? } | (xTotal, yTotal) => { x, y, min?, max? }` — an axis is a number or a function of that axis's child total (`size={{ x: 1200, y: (yt) => yt + 10 }}`); a **negative axis flips the content** in that direction (layout uses the magnitude); an omitted axis hugs the children's required space; `min`/`max` are per-axis limits taking numbers or `"childTotals"` (see above).
- `size.min` / `size.max` — per-axis limits inside the size object: `min` floors the coordinate space children anchor into (content overflows instead of colliding); `max` caps the visual box (content-hugging stops growing and overflows instead). Both accept numbers or `"childTotals"`.
- `pivot?: Pivot | { from?: Pivot, to?: Pivot }` — attach points on the reference and on this box. A bare pivot string sets both: `pivot="center"` is center-to-center. Default `topLeft`/`topLeft`; an unspecified `to` mirrors `from`.
- `stackMode?: "vertical" | "horizontal" | "verticalReverse" | "horizontalReverse"` — sibling-stacking shorthand (below / right / above / left of the previous sibling); excludes `pivot`.
- `relativeTo?: "parent" | "siblings"` — what the box positions against. Default `"parent"`.
- `overflow?: { x?: OverflowMode, y?: OverflowMode }` — `"visible" | "clip" | "scrollbar" | "auto" | "ellipsis"` per axis. Default `visible` (`auto` shows scrollbars only when content overflows). `ellipsis` is for text on the x axis; on y it clips.
- `border?: { width: number, color?: string, style?: "solid" | "dashed" | "dotted" | "double", overlay?: boolean, sides?: BorderSide | BorderSide[] }` (`BorderSide` = `"top" | "right" | "bottom" | "left"`; a single side needs no array) — default `overlay: true`: the border is paint centered on the box edge, taking no space, so coincident edges share one line. `overlay: false` draws it inside the declared size and shrinks the interior. `sides` restricts the border to the listed edges (default: all four); inset insets become per-edge accordingly.
- `zValue?: unknown` — stacking order among siblings. Numbers sort lowest→highest by default; anything else falls back to string comparison, or to the parent's `zSort`. Boxes without a `zValue` stay in DOM order beneath ranked ones. Pass referentially stable values (module-level consts, not inline object literals).
- `zSort?: (a, b) => number` — comparator the **parent** provides for its children's `zValue`s, enabling arbitrary objects as z values.
- `rotate?: number` — degrees, paint-only with SVG semantics: the box rotates visually around its center, but layout, registration, and `childTotals` all use the unrotated rectangle.
- `sticky?: boolean` — pins the box inside the nearest scrollable ancestor via native CSS sticky (compositor-driven, zero lag); `position` becomes the pinned offset from the scroll container's top-left. Pivots/stacking don't apply to sticky boxes. Use this for pinning; use `useParentScroll()` for scroll-*data* (progress indicators, parallax), where a frame of lag is fine.
- `name?: string` — label shown by the debug inspector.
- `style?: PaintStyle` — paint-only styles (background, radius, shadow, opacity, outline, cursor, filter, transition, …); layout-flavored CSS is a type error.
- `onClick?`, `onPointerDown?`, `onPointerUp?`, `hover?` — pointer handlers. An `onClick` also sets `cursor: pointer` automatically (an explicit `style.cursor` wins).
- `clickThrough?: boolean` — makes the element transparent to the mouse: hover and clicks pass through to whatever is beneath it, regardless of stacking order. For overlays and decorations sitting above interactive content. Descendants with their own pointer handlers re-enable themselves; everything else in the subtree stays transparent. All-or-nothing per element (a CSS limit): an element can't keep clicks while passing hover through. Note it also disables scrolling on the element itself.
- `dangerousPositionStyles?: CSSProperties` — raw CSS merged after the computed layout; overrides anything, on purpose, loudly.
- `hover?: { onEnter?, onLeave?, onMove? }` — `HoverHandlers<HTMLDivElement>`; listeners are attached only for the handlers given.
- `onClick?`, `onPointerDown?`, `onPointerUp?` — click and press handlers on the element.
- `children?: ReactNode`

`<BoxText>` — all `Box` props except `size`, plus:

- `size?: { x?: number, y?: number }` — both axes optional; unset axes size from the text itself.
- `font?: { family?, size?, weight?, color?, lineHeight?, letterSpacing?, align?, style? }` — `align` is `"left" | "center" | "right"`; `style` is one of or an array of `"bold" | "italic" | "underline" | "strikethrough"`.
- `baseline?: boolean` — `position.y` names the first line's **baseline** (the line the letters sit on) instead of the box top, so texts of different font sizes given the same y sit on the same line. Computed from canvas font metrics; approximate with exotic fonts or before webfonts load.

`<Image>` — all `Box` props, plus:

- `src: string`
- `alt?: string`
- Sizing is the fit policy: both axes set → the image stretches to exactly that box; **one axis set → the other is derived from the image's natural aspect ratio** (no distortion); no size → the image's natural pixel size. A negative axis mirrors the image; derived axes appear once the image loads (cached images resolve immediately).

`<Arrange>` — not a box: a rendering strategy for the children of whatever `Box` it sits in. It folds over items, giving each one the measured rectangles of the items before it — the primitive for wrap layouts, masonry, or any sequential placement you compute yourself. Its items are ordinary children of the enclosing `Box` (they count toward its `childTotals`, join its sibling chain, and so on):

- `items: readonly T[]`
- `render: (item, { index, prior, parentSize }) => ReactNode` — `prior` is the ordered list of already-measured `ChildRect`s for items before this one; `parentSize` is the enclosing box's inner pixel size. Each render should return one positioned element (wrap multi-part items in a single `Box`).

`<Embed>` — all `Box` props except `size`, plus:

- `size?: { x?: number, y?: number }` — fixed axes; unset axes are measured from the foreign content inside.
- Children are raw HTML (or anything), rendered in normal CSS flow inside the measured rectangle.

`<Line>` / `<Polygon>` / `<Ellipse>` — parent-relative shapes outside the layout system (no sibling chain, no `childTotals`, no pivots):

- `from: {x, y}`, `to: {x, y}` (`Line`) / `points: {x, y}[]` (`Polygon`) / `center: {x, y}` and `radius: number | {x, y}` (`Ellipse`; a number radius is a circle) — parent coordinates.
- `stroke?: { width?, color?, cap?: "butt" | "round" | "square", dash?: number[] } | "none"` — defaults: 1px, `currentColor`; `"none"` turns the outline off entirely (a fill-only shape).
- `fill?: string` (`Polygon` and `Ellipse`) — default `none`.
- `zValue?: unknown`, `name?: string` — same meaning as on `Box`; shapes take part in z-ranking and the inspector tree, just not in layout. Pointer handlers (`onClick`, `onPointerDown`/`Up`, `hover`) make the drawn geometry itself clickable (the empty bounding box never catches the pointer).

`<Inset>` — floats inside a `BoxText`'s content so the words flow around it; it lives in the text flow, **not** the coordinate system (no `position`/`pivot`, doesn't register a rect):

- `size: {x, y}` (required), `side?: "left" | "right"` (default left), `margin?: number` (default 8)
- `src?`/`alt?` for an image inset (stretched to `size`), or arbitrary `children`.

`<BoxRoot>`:

- `fill?: "window" | "parent"` — default `"window"`: the root covers the browser viewport, independent of the page's CSS. `"parent"` embeds it in a CSS container instead.
- `debug?: boolean` — enables the debug inspector. Default `false`.
- `grid?: boolean | { step?: number }` — overlays pixel gridlines on the coordinate space: faint lines every `step / 10`, stronger lines every `step` (default 100) with pixel labels along the top and left edges. Non-interactive (clicks pass through) and excluded from layout and the inspector tree; covers the full scrollable extent.
- `overflow?: { x?, y? }` — default `{ x: "auto", y: "auto" }`: the page scrolls when content overflows.
- `size?: { x?, y?, min?, max? }` — `x`/`y` fix the root's pixel size in the page flow; `min`/`max` limit the measured coordinate space (below `min`, scroll instead of collapse).
- `zSort?: (a, b) => number` — comparator for its direct children's `zValue`s.
- `style?: CSSProperties`
- `children?: ReactNode`

### Hooks

- `useParentBoxProps(options?)` — the parent box's size (see above).
- `useParentScroll()` — `{ offset: {x, y} }`, the live scroll offset of the nearest enclosing box. Non-scrolling parents report `{0, 0}`. For scroll-driven *data* (progress readouts, reveal effects); for pinning, use the `sticky` prop — JS repositioning trails the compositor by a frame and visibly lags.

## Debug mode

```tsx
<BoxRoot debug>...</BoxRoot>
```

Off by default. With `debug` on, the inspector panel is shown immediately — if you don't want it, turn `debug` off. **Ctrl/Cmd+Shift+D** toggles it, it closes with its ✕, and it drags by its header when it's covering something.

- Checkboxes outline every `Box` (blue) and every `BoxText` (magenta) so you can see where the rectangles actually are, and a third toggle highlights **dead space** — fixed-size boxes noticeably larger than their children's extent get red hatching, the tell-tale of a guessed height that should probably be `childTotals`.
- Click any element to select it (red outline). The panel identifies it — the `name` prop if you set one, otherwise its text content for string labels, plus the React instance id — and shows its layout props (`position`, `size`, `pivot`, `relativeTo`, `stackMode`, `overflow`, `border`) as JSON. Give the boxes you expect to debug a `name`; it's the greppable link back to the code.
- Edit the JSON and hit **Apply** to inject the values into the live page; the element re-lays-out immediately, and everything that depends on it (stacked siblings, `childTotals` parents) follows. **Clear override** restores the real props.
- **drag to edit** puts handles on every `Box` whose values are drag-editable: a circle at the box's own pivot point drags its `position`, and a square at the bottom-right corner drags its `size`. Handles appear only where the numbers are really numbers — a whole-function `size` gets no resize handle, and a function axis stays function-driven while the other axis drags (an unset, hugging axis becomes a concrete number once you resize it). Drags write the same overrides as Apply, so the selected element's JSON tracks the drag live.

Overrides are validated (bad JSON or wrong shapes show an inline error and change nothing), live only in memory, and never touch your code — reload and they're gone. A function-form `size` shows as `"(function)"` in the snapshot; applying it unchanged keeps the function, and replacing it with a concrete value overrides it.

## Layout inspection (for agents)

```tsx
<BoxRoot inspect>...</BoxRoot>
```

Off by default, toggled like `debug`. With `inspect` on, the page continuously snapshots its layout as a JSON tree — every `Box`/`BoxText`, nested, with the exact corner coordinates of each rectangle (`topLeft`/`topRight`/`bottomRight`/`bottomLeft`, relative to the `BoxRoot` origin, read from the live DOM so it is ground truth, not intent). Two consumers:

- **`window.__boxflowTree()`** — returns the current snapshot on demand, for agents driving the browser directly.
- **The layout MCP server** (`mcp/server.mjs`, registered in `.mcp.json` so agents in this repo get it automatically). The page POSTs changed snapshots to it (default `http://localhost:4848/layout`, configurable via `inspect={{ url, intervalMs }}`); the server exposes two tools: `layout_tree` (the full latest tree) and `find_box` (matches against `name` props — another reason to name your boxes). If no snapshot has arrived, the tools say so instead of guessing.

Coordinates are current *visual* positions (scrolled content reports where it is now), rounded to 2 decimals for stable diffs.

## How positioning works

Each `Box` renders a `position: absolute` div. CSS resolves absolute coordinates against the nearest *positioned* ancestor — and because every `Box` is itself absolutely positioned, each `Box` is the containing block for the boxes inside it. The coordinate chain therefore follows the `Box` nesting with no extra wrappers. `BoxRoot` is `position: relative` to anchor the outermost boxes.

Two things to keep in mind:

- Don't put your own `position: relative/absolute/fixed` element between a `Box` and its children's `Box`es — it would capture their coordinates. Plain (static) wrappers are fine.
- Absolute children resolve against the parent's *padding box* (inside its border). Use the `border` prop rather than `style.border`: the library subtracts it from the anchor math and from `useParentBoxProps({ countBorder: true })`, while a border smuggled in via `style` is invisible to it.
- CSS coerces `overflow: visible` on one axis to `auto` when the other axis is `clip`/`scrollbar`, so `{ x: "visible", y: "scrollbar" }` clips on x anyway. This is a browser rule, not a library choice.

## Installing in another project

The package ships compiled ESM plus type declarations in `dist/` (nothing else). From another project, install it straight from this directory:

```
npm install ~/code/boxcomponents
```

or as a tarball, which snapshots the current build instead of symlinking:

```
cd ~/code/boxcomponents && npm pack
npm install ~/code/boxcomponents/boxflow-0.1.0.tgz
```

Then:

```tsx
import { Box, BoxRoot, BoxText } from "boxflow";
```

`react >= 18` is a peer dependency. The directory install is a symlink, so `npm run build` here is what updates consumers; `prepare` runs the build automatically on install from a path or git URL.

## Development

```
npm install
npm run check   # oxlint + oxfmt + tsc + vitest
npm run dev     # serve the example app (example/) with Vite
npm run build   # emit dist/
```

The `example/` directory is a small Vite app exercising every feature of the library. It has three tabs (the tab bar itself is built from `Box`es with a `childTotals` wrapper): **Demos**, where each card carries a caption naming the features it shows; **CSS recipes**, familiar patterns rebuilt with coordinates — navbar (space-between), holy-grail layout, a 1fr-column card grid, media object, hero overlay, corner badge with tooltip, a percentage progress bar, a collapsed-borders grid with a `sides: "bottom"` header rule, the shape primitives (`Line`/`Polygon`/`Ellipse`, including `stroke="none"` dots), CSS islands (nested `BoxRoot size={{x, y}}` and `fill="parent"` roots bridged by `Embed`), hover & click (pointer handlers on boxes and shapes, automatic `cursor: pointer`, a `clickThrough` veil the chips stay hoverable through), and rotate & flip (`rotate`, negative-size mirroring, a `dangerousPositionStyles` skew), each card labeling the CSS it replaces, all flowed onto rows by `<Arrange>` (grid auto-flow) inside a scrollable box; and **Playground**, a full-screen dashed canvas backed by the empty `example/Playground.tsx` — put your own boxes there and hot reload renders them inside it. The demos:

- **TopBars** — the split bars from the snippet above: `useParentBoxProps` plus `resolvedAxis`, sizes derived from the root.
- **Playfield** — bouncing sprite images driven by a `requestAnimationFrame` loop. Sprites are `Image`s sized on one axis only (height derived from the natural aspect ratio), stacked by `zValue` through a custom `zSort`, and a dashed `Line` tracks the closest pair. Shows the payoff of positions being plain data: every frame it computes each sprite's nearest neighbor and the overall closest pair straight from the `position` values — no `getBoundingClientRect` — and renders the distances as labels that track the sprites.
- **Scrollable card** — an inset border (`overlay: false`) with `countBorder`, per-axis `overflow` (`clip` + `scrollbar`), a header pinned with `sticky` + `zValue` while `useParentScroll()` feeds its live scrolled-distance readout, row labels vertically centered by pivoting intrinsic `BoxText`. The Demos tab itself sits on the root's `minSize`: narrow the window below 1160px and the page scrolls horizontally instead of letting columns collide.
- **AutoPanel** (left column, below the playfield) — sibling stacking and child-driven sizing together: every row is `stackMode="vertical"` with `position` as the gap (no manual y math anywhere), and the panel itself uses the function form (`(xt, yt) => ({ x: xt + 24, y: yt + 24 })` for 12px padding). Its chip shelf covers the rest: an unsized (content-hugging) strip of horizontally stacked chips, then a `size={{ x: 40 }}` column placed beside it with an explicit sibling pivot pair (`relativeTo="siblings" pivot={{ from: "topRight", to: "topLeft" }}`), both wrapped in a content-hugging box so the row below stacks under the taller of the two. Rows sample every `font.style`, the title uses `letterSpacing`, one paragraph wraps at `size={{ x: 180 }}` with `align: "center"` and `lineHeight`, one text fits `size={{ y: 42 }}` by finding its own width, and one row prints what `useParentBoxProps` reports inside a child-driven box — `kind: "childTotals"` — and the native `<form>` inside `<Embed>` is width-constrained (`size={{ x: 170 }}`) with its height measured.
- **CornerBadge** — a `Box` pinned to the bottom-right corner that auto-fits its label: a per-axis size function (`size={{ x: (xt) => xt + 12, y: 36 }}`) adds padding around the intrinsic `BoxText` inside it.
