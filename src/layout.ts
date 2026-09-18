import type { CSSProperties } from "react";
import type {
  AxisSizeSpec,
  BoxBorder,
  BoxOverflow,
  ChildAnchor,
  ChildRect,
  OverflowMode,
  Pivot,
  PivotPair,
  SizeSpec,
  SizeValues,
  StackMode,
  TextFont,
  Vec2,
  ZSort,
} from "./types";

const PIVOT_FRACTIONS: Record<Pivot, Vec2> = {
  topLeft: { x: 0, y: 0 },
  topCenter: { x: 0.5, y: 0 },
  topRight: { x: 1, y: 0 },
  centerLeft: { x: 0, y: 0.5 },
  center: { x: 0.5, y: 0.5 },
  centerRight: { x: 1, y: 0.5 },
  bottomLeft: { x: 0, y: 1 },
  bottomCenter: { x: 0.5, y: 1 },
  bottomRight: { x: 1, y: 1 },
};

export interface LayoutInput {
  from: Pivot;
  to: Pivot;
  position: Vec2;
  size: Vec2;
  reference: ChildRect;
}

export function computeTopLeft({ from, to, position, size, reference }: LayoutInput): Vec2 {
  const anchor = PIVOT_FRACTIONS[from];
  const own = PIVOT_FRACTIONS[to];
  const attachX = reference.left + anchor.x * (reference.right - reference.left);
  const attachY = reference.top + anchor.y * (reference.bottom - reference.top);
  return {
    x: attachX + position.x - own.x * size.x,
    y: attachY + position.y - own.y * size.y,
  };
}

export const ZERO_RECT: ChildRect = { left: 0, top: 0, right: 0, bottom: 0 };

export function attachFor(
  pivot: PivotPair | undefined,
  stackMode: StackMode | undefined,
): { from: Pivot; to: Pivot } {
  if (pivot && stackMode) {
    throw new Error("A box cannot take both pivot and stackMode; stackMode implies the pivots");
  }
  if (stackMode === "vertical") return { from: "bottomLeft", to: "topLeft" };
  if (stackMode === "horizontal") return { from: "topRight", to: "topLeft" };
  if (stackMode === "verticalReverse") return { from: "topLeft", to: "bottomLeft" };
  if (stackMode === "horizontalReverse") return { from: "topLeft", to: "topRight" };
  return { from: pivot?.from ?? "topLeft", to: pivot?.to ?? "topLeft" };
}

export function previousRect(
  rects: ReadonlyMap<string, ChildRect>,
  id: string,
): ChildRect | undefined {
  let previous: ChildRect | undefined;
  for (const [key, rect] of rects) {
    if (key === id) return previous;
    previous = rect;
  }
  return previous;
}

export function pivotFraction(pivot: Pivot): Vec2 {
  return PIVOT_FRACTIONS[pivot];
}

export function borderToCss(border: BoxBorder | undefined): CSSProperties {
  if (!border) return {};
  return {
    border: `${border.width}px ${border.style ?? "solid"} ${border.color ?? "currentColor"}`,
  };
}

export function resolveSize(size: SizeSpec, childTotals: Vec2): Vec2 {
  if (size === "childTotals") return { x: childTotals.x, y: childTotals.y };
  if (typeof size === "function") return size(childTotals.x, childTotals.y);
  return {
    x: size.x === "childTotals" ? childTotals.x : size.x,
    y: size.y === "childTotals" ? childTotals.y : size.y,
  };
}

export function sizeValues(size: SizeSpec): SizeValues {
  if (size === "childTotals" || typeof size === "function") {
    return { x: "childTotals", y: "childTotals" };
  }
  return { x: size.x, y: size.y };
}

export function sizeNeedsChildTotals(size: SizeSpec): boolean {
  if (size === "childTotals" || typeof size === "function") return true;
  return size.x === "childTotals" || size.y === "childTotals";
}

export function anchorFromFraction(fraction: number): ChildAnchor {
  if (fraction === 0) return "start";
  if (fraction === 1) return "end";
  return "center";
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function childTotalsFromRects(rects: ReadonlyMap<string, ChildRect>): Vec2 {
  if (rects.size === 0) return { x: 0, y: 0 };
  const list = [...rects.values()];
  let x = 0;
  let y = 0;
  for (const rect of list) {
    const reachX = rect.reachX ?? rect.right;
    const reachY = rect.reachY ?? rect.bottom;
    x = Math.max(x, reachX);
    y = Math.max(y, reachY);
    if ((rect.anchorX ?? "start") === "start") {
      for (const other of list) {
        if (other === rect || other.anchorX !== "end") continue;
        if (!overlaps(rect.top, rect.bottom, other.top, other.bottom)) continue;
        x = Math.max(x, reachX + (other.reachX ?? 0));
      }
    }
    if ((rect.anchorY ?? "start") === "start") {
      for (const other of list) {
        if (other === rect || other.anchorY !== "end") continue;
        if (!overlaps(rect.left, rect.right, other.left, other.right)) continue;
        y = Math.max(y, reachY + (other.reachY ?? 0));
      }
    }
  }
  return { x, y };
}

export function childReach(
  anchor: ChildAnchor,
  nearEdge: number,
  size: number,
  inner: number,
): number {
  if (anchor === "start") return nearEdge + size;
  if (anchor === "end") return inner - nearEdge;
  return size;
}

export function resolvedAxis(value: AxisSizeSpec, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

const OVERFLOW_CSS: Record<OverflowMode, "visible" | "hidden" | "scroll" | "auto"> = {
  visible: "visible",
  clip: "hidden",
  scrollbar: "scroll",
  auto: "auto",
  ellipsis: "hidden",
};

export function fontToCss(font: TextFont | undefined): CSSProperties {
  const styleList = font?.style ?? [];
  const styles = new Set(Array.isArray(styleList) ? styleList : [styleList]);
  const decorations = [];
  if (styles.has("underline")) decorations.push("underline");
  if (styles.has("strikethrough")) decorations.push("line-through");
  const boldWeight = styles.has("bold") ? "bold" : undefined;
  return {
    fontFamily: font?.family ?? "system-ui, sans-serif",
    fontSize: font?.size,
    fontWeight: font?.weight ?? boldWeight,
    color: font?.color,
    lineHeight: font?.lineHeight,
    letterSpacing: font?.letterSpacing,
    fontStyle: styles.has("italic") ? "italic" : undefined,
    textDecoration: decorations.length > 0 ? decorations.join(" ") : undefined,
    textAlign: font?.align,
  };
}

export function overflowToCss(overflow: BoxOverflow | undefined): CSSProperties {
  const x = overflow?.x ?? "visible";
  const y = overflow?.y ?? "visible";
  return {
    overflowX: OVERFLOW_CSS[x],
    overflowY: OVERFLOW_CSS[y],
    overscrollBehaviorX: x === "scrollbar" || x === "auto" ? "contain" : undefined,
    overscrollBehaviorY: y === "scrollbar" || y === "auto" ? "contain" : undefined,
    textOverflow: x === "ellipsis" ? "ellipsis" : undefined,
    whiteSpace: x === "ellipsis" ? "nowrap" : undefined,
  };
}

export function defaultZCompare(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const sa = String(a);
  const sb = String(b);
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

export function computeZRanks(
  childZ: ReadonlyMap<string, unknown>,
  zSort: ZSort | undefined,
): ReadonlyMap<string, number> {
  const entries = [...childZ.entries()];
  const compare = zSort ?? defaultZCompare;
  entries.sort((a, b) => compare(a[1], b[1]));
  return new Map(entries.map(([id], index) => [id, index + 1]));
}

export const ZERO_VEC: Vec2 = { x: 0, y: 0 };
