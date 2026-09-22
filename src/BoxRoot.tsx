import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BoxContext, useChildRects } from "./context";
import { DebugProvider } from "./debug";
import { buildLayoutSnapshot } from "./inspect";
import {
  ZERO_VEC,
  childTotalsFromRects,
  clampAxis,
  computeZRanks,
  overflowToCss,
  resolveLimit,
} from "./layout";
import type { BoxOverflow, SizeLimit, Vec2, ZSort } from "./types";

export interface InspectOptions {
  url?: string;
  intervalMs?: number;
}

export interface BoxRootProps {
  style?: CSSProperties;
  debug?: boolean;
  inspect?: boolean | InspectOptions;
  zSort?: ZSort;
  overflow?: BoxOverflow;
  size?: { min?: SizeLimit; max?: SizeLimit };
  children?: ReactNode;
}

const DEFAULT_ROOT_OVERFLOW: BoxOverflow = { x: "auto", y: "auto" };
const DEFAULT_INSPECT_URL = "http://localhost:4848/layout";

export function BoxRoot({
  style,
  debug = false,
  inspect = false,
  zSort,
  overflow = DEFAULT_ROOT_OVERFLOW,
  size: sizeLimitsProp,
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
    const minResolved = resolveLimit(sizeLimitsProp?.min, totals);
    const maxResolved = resolveLimit(sizeLimitsProp?.max, totals);
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
    sizeLimitsProp,
    childRects,
    childZ,
    zSort,
    registerChild,
    unregisterChild,
    registerZ,
    unregisterZ,
  ]);

  const content = value ? (
    <BoxContext.Provider value={value}>{children}</BoxContext.Provider>
  ) : undefined;

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        height: "100%",
        ...style,
        position: "relative",
        ...overflowToCss(overflow),
      }}
    >
      {debug ? <DebugProvider>{content}</DebugProvider> : content}
    </div>
  );
}
