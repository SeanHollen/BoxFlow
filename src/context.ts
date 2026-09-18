import { createContext, useCallback, useContext, useState } from "react";
import type { BoxContextValue, ChildRect, ParentBoxProps, Vec2 } from "./types";

function sameRect(a: ChildRect, b: ChildRect): boolean {
  return a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom;
}

export function useChildRects(): {
  childRects: ReadonlyMap<string, ChildRect>;
  childZ: ReadonlyMap<string, unknown>;
  registerChild: (id: string, rect: ChildRect) => void;
  unregisterChild: (id: string) => void;
  registerZ: (id: string, zValue: unknown) => void;
  unregisterZ: (id: string) => void;
} {
  const [childRects, setChildRects] = useState<ReadonlyMap<string, ChildRect>>(() => new Map());
  const [childZ, setChildZ] = useState<ReadonlyMap<string, unknown>>(() => new Map());

  const registerChild = useCallback((id: string, rect: ChildRect) => {
    setChildRects((prev) => {
      const existing = prev.get(id);
      if (existing && sameRect(existing, rect)) return prev;
      const next = new Map(prev);
      next.set(id, rect);
      return next;
    });
  }, []);

  const unregisterChild = useCallback((id: string) => {
    setChildRects((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const registerZ = useCallback((id: string, zValue: unknown) => {
    setChildZ((prev) => {
      if (prev.has(id) && Object.is(prev.get(id), zValue)) return prev;
      const next = new Map(prev);
      next.set(id, zValue);
      return next;
    });
  }, []);

  const unregisterZ = useCallback((id: string) => {
    setChildZ((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return { childRects, childZ, registerChild, unregisterChild, registerZ, unregisterZ };
}

export const BoxContext = createContext<BoxContextValue | undefined>(undefined);

export function useBoxContext(): BoxContextValue {
  const value = useContext(BoxContext);
  if (!value) {
    throw new Error("useParentBoxProps must be called inside a <BoxRoot> or <Box>");
  }
  return value;
}

export interface ParentBoxPropsOptions {
  countBorder?: boolean;
}

export function useParentBoxProps(options?: ParentBoxPropsOptions): ParentBoxProps {
  const { size, innerSizeValues } = useBoxContext();
  return { size: options?.countBorder ? innerSizeValues : size };
}

export function useParentScroll(): { offset: Vec2 } {
  const { scrollOffset } = useBoxContext();
  return { offset: scrollOffset };
}
