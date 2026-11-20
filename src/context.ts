import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from "react";
import { toParentAxis } from "./layout.js";
import type { BoxContextValue, ChildRect, ParentBoxProps, Vec2 } from "./types.js";

function sameRect(a: ChildRect, b: ChildRect): boolean {
  return a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom;
}

function documentOrder(elements: ReadonlyMap<string, Element>, a: string, b: string): number {
  const ea = elements.get(a);
  const eb = elements.get(b);
  if (!ea && !eb) return 0;
  if (!ea) return 1;
  if (!eb) return -1;
  return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

function inDocumentOrder(
  rects: ReadonlyMap<string, ChildRect>,
  elements: ReadonlyMap<string, Element>,
): boolean {
  let previous: string | undefined;
  for (const id of rects.keys()) {
    if (previous !== undefined && documentOrder(elements, previous, id) > 0) return false;
    previous = id;
  }
  return true;
}

export function useOrderedRects(contents: unknown): {
  rects: ReadonlyMap<string, ChildRect>;
  register: (id: string, rect: ChildRect, element: Element | undefined) => void;
  unregister: (id: string) => void;
} {
  const [rects, setRects] = useState<ReadonlyMap<string, ChildRect>>(() => new Map());
  const elements = useRef(new Map<string, Element>());

  const register = useCallback((id: string, rect: ChildRect, element: Element | undefined) => {
    if (element) elements.current.set(id, element);
    setRects((prev) => {
      const existing = prev.get(id);
      if (existing && sameRect(existing, rect)) return prev;
      const next = new Map(prev);
      next.set(id, rect);
      return next;
    });
  }, []);

  const unregister = useCallback((id: string) => {
    elements.current.delete(id);
    setRects((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    if (inDocumentOrder(rects, elements.current)) return;
    setRects((prev) => {
      const order = elements.current;
      return new Map([...prev].sort(([a], [b]) => documentOrder(order, a, b)));
    });
  }, [rects, contents]);

  return { rects, register, unregister };
}

export function useChildRects(contents: unknown): {
  childRects: ReadonlyMap<string, ChildRect>;
  childZ: ReadonlyMap<string, unknown>;
  registerChild: (id: string, rect: ChildRect, element: Element | undefined) => void;
  unregisterChild: (id: string) => void;
  registerZ: (id: string, zValue: unknown) => void;
  unregisterZ: (id: string) => void;
} {
  const {
    rects: childRects,
    register: registerChild,
    unregister: unregisterChild,
  } = useOrderedRects(contents);
  const [childZ, setChildZ] = useState<ReadonlyMap<string, unknown>>(() => new Map());

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
  const values = options?.countBorder ? innerSizeValues : size;
  return { size: { x: toParentAxis(values.x), y: toParentAxis(values.y) } };
}

export function useParentScroll(): { offset: Vec2 } {
  const { scrollOffset } = useBoxContext();
  return { offset: scrollOffset };
}
