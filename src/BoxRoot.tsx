import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BoxContext, useChildRects } from "./context";
import { DebugProvider } from "./debug";
import { ZERO_VEC, computeZRanks } from "./layout";
import type { Vec2, ZSort } from "./types";

export interface BoxRootProps {
  style?: CSSProperties;
  debug?: boolean;
  zSort?: ZSort;
  children?: ReactNode;
}

export function BoxRoot({ style, debug = false, zSort, children }: BoxRootProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Vec2 | undefined>(undefined);
  const { childRects, childZ, registerChild, unregisterChild, registerZ, unregisterZ } =
    useChildRects();

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

  const value = useMemo(
    () =>
      size
        ? {
            size,
            innerSizeValues: size,
            resolvedInnerSize: size,
            childRects,
            zRanks: computeZRanks(childZ, zSort),
            scrollOffset: ZERO_VEC,
            registerChild,
            unregisterChild,
            registerZ,
            unregisterZ,
          }
        : undefined,
    [size, childRects, childZ, zSort, registerChild, unregisterChild, registerZ, unregisterZ],
  );

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
        overflow: "hidden",
      }}
    >
      {debug ? <DebugProvider>{content}</DebugProvider> : content}
    </div>
  );
}
