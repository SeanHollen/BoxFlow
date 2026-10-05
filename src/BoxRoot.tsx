import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BoxContext, useChildRects } from "./context.js";
import { DebugProvider } from "./debug.js";
import { GridOverlay } from "./grid.js";
import type { GridOptions } from "./grid.js";
import { buildLayoutSnapshot } from "./inspect.js";
import {
  ZERO_VEC,
  childTotalsFromRects,
  clampAxis,
  computeZRanks,
  overflowToCss,
  resolveLimit,
} from "./layout.js";
import type { BoxOverflow, SizeLimit, Vec2, ZSort } from "./types.js";

export interface InspectOptions {
  url?: string;
  intervalMs?: number;
}

export interface BoxRootProps {
  style?: CSSProperties;
  debug?: boolean;
  inspect?: boolean | InspectOptions;
  zSort?: ZSort;
  grid?: boolean | GridOptions;
  fill?: "window" | "parent";
  overflow?: BoxOverflow;
  size?: { x?: number; y?: number; min?: SizeLimit; max?: SizeLimit };
  children?: ReactNode;
}

function rootExtent(fill: "window" | "parent", size: BoxRootProps["size"]): CSSProperties {
  if (size?.x !== undefined || size?.y !== undefined) {
    return { position: "relative", width: size.x ?? "100%", height: size.y ?? "100%" };
  }
  if (fill === "parent") {
    return { position: "relative", width: "100%", height: "100%" };
  }
  return { position: "fixed", top: 0, left: 0, right: 0, bottom: 0 };
}

const DEFAULT_ROOT_OVERFLOW: BoxOverflow = { x: "auto", y: "auto" };
const DEFAULT_INSPECT_URL = "http://localhost:4848/layout";

export function BoxRoot({
  style,
  debug = false,
  inspect = false,
  zSort,
  grid = false,
  fill = "window",
  overflow = DEFAULT_ROOT_OVERFLOW,
  size: sizeProp,
  children,
}: BoxRootProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Vec2 | undefined>(undefined);
  const { childRects, childZ, registerChild, unregisterChild, registerZ, unregisterZ } =
    useChildRects();

  const inspectUrl =
    typeof inspect === "object" ? (inspect.url ?? DEFAULT_INSPECT_URL) : DEFAULT_INSPECT_URL;
  const inspectInterval = typeof inspect === "object" ? (inspect.intervalMs ?? 500) : 500;
  const inspectOn = inspect !== false;

  useEffect(() => {
    if (!inspectOn) return;
    const snapshot = () => (ref.current ? buildLayoutSnapshot(ref.current) : undefined);
    (window as unknown as Record<string, unknown>).__boxflowTree = snapshot;
    let lastSent = "";
    const timer = setInterval(() => {
      const current = snapshot();
      if (!current) return;
      const body = JSON.stringify(current);
      const comparable = JSON.stringify(current.tree);
      if (comparable === lastSent) return;
      void (async () => {
        try {
          await fetch(inspectUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
          });
          lastSent = comparable;
        } catch {
          // inspector server not running yet; retry on the next tick
        }
      })();
    }, inspectInterval);
    return () => {
      clearInterval(timer);
      delete (window as unknown as Record<string, unknown>).__boxflowTree;
    };
  }, [inspectOn, inspectUrl, inspectInterval]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setSize((prev) =>
        prev && prev.x === el.clientWidth && prev.y === el.clientHeight
          ? prev
          : { x: el.clientWidth, y: el.clientHeight },
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const value = useMemo(() => {
    if (!size) return undefined;
    const totals = childTotalsFromRects(childRects);
    const minResolved = resolveLimit(sizeProp?.min, totals);
    const maxResolved = resolveLimit(sizeProp?.max, totals);
    const floored = {
      x: clampAxis(clampAxis(size.x, undefined, maxResolved.x), minResolved.x, undefined),
      y: clampAxis(clampAxis(size.y, undefined, maxResolved.y), minResolved.y, undefined),
    };
    return {
      size: floored,
      innerSizeValues: floored,
      resolvedInnerSize: floored,
      childRects,
      zRanks: computeZRanks(childZ, zSort),
      scrollOffset: ZERO_VEC,
      registerChild,
      unregisterChild,
      registerZ,
      unregisterZ,
    };
  }, [
    size,
    sizeProp,
    childRects,
    childZ,
    zSort,
    registerChild,
    unregisterChild,
    registerZ,
    unregisterZ,
  ]);

  const gridOverlay =
    grid !== false && value ? (
      <GridOverlay
        size={{
          x: Math.max(value.size.x, childTotalsFromRects(childRects).x),
          y: Math.max(value.size.y, childTotalsFromRects(childRects).y),
        }}
        options={grid === true ? {} : grid}
      />
    ) : undefined;

  const content = value ? (
    <BoxContext.Provider value={value}>
      {children}
      {gridOverlay}
    </BoxContext.Provider>
  ) : undefined;

  return (
    <div
      ref={ref}
      style={{
        ...rootExtent(fill, sizeProp),
        ...style,
        ...overflowToCss(overflow),
      }}
    >
      {debug ? <DebugProvider>{content}</DebugProvider> : content}
    </div>
  );
}
