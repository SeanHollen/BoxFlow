import { Fragment, useCallback, useState } from "react";
import type { ReactNode } from "react";
import { BoxContext, useBoxContext } from "./context";
import type { BoxContextValue, ChildRect, Vec2 } from "./types";

export interface ArrangeItemContext {
  index: number;
  prior: readonly ChildRect[];
  parentSize: Vec2;
}

export interface ArrangeProps<T> {
  items: readonly T[];
  render: (item: T, context: ArrangeItemContext) => ReactNode;
}

function sameRect(a: ChildRect, b: ChildRect): boolean {
  return a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom;
}

export function Arrange<T>({ items, render }: ArrangeProps<T>) {
  const parent = useBoxContext();
  const [itemRects, setItemRects] = useState<ReadonlyMap<string, ChildRect>>(() => new Map());

  const { registerChild: parentRegister, unregisterChild: parentUnregister } = parent;

  const registerChild = useCallback(
    (id: string, rect: ChildRect) => {
      parentRegister(id, rect);
      setItemRects((prev) => {
        const existing = prev.get(id);
        if (existing && sameRect(existing, rect)) return prev;
        const next = new Map(prev);
        next.set(id, rect);
        return next;
      });
    },
    [parentRegister],
  );

  const unregisterChild = useCallback(
    (id: string) => {
      parentUnregister(id);
      setItemRects((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    },
    [parentUnregister],
  );

  const value: BoxContextValue = { ...parent, registerChild, unregisterChild };
  const ordered = [...itemRects.values()];

  return (
    <BoxContext.Provider value={value}>
      {items.map((item, index) => (
        <Fragment key={index}>
          {render(item, {
            index,
            prior: ordered.slice(0, index),
            parentSize: parent.resolvedInnerSize,
          })}
        </Fragment>
      ))}
    </BoxContext.Provider>
  );
}
