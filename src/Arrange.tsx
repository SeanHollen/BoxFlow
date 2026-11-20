import { Fragment, useCallback } from "react";
import type { ReactNode } from "react";
import { BoxContext, useBoxContext, useOrderedRects } from "./context.js";
import type { BoxContextValue, ChildRect, Vec2 } from "./types.js";

export interface ArrangeItemContext {
  index: number;
  prior: readonly ChildRect[];
  parentSize: Vec2;
}

export interface ArrangeProps<T> {
  items: readonly T[];
  render: (item: T, context: ArrangeItemContext) => ReactNode;
}

export function Arrange<T>({ items, render }: ArrangeProps<T>) {
  const parent = useBoxContext();
  const {
    rects: itemRects,
    register: registerItem,
    unregister: unregisterItem,
  } = useOrderedRects(items);
  const { registerChild: parentRegister, unregisterChild: parentUnregister } = parent;

  const registerChild = useCallback(
    (id: string, rect: ChildRect, element: Element | undefined) => {
      parentRegister(id, rect, element);
      registerItem(id, rect, element);
    },
    [parentRegister, registerItem],
  );

  const unregisterChild = useCallback(
    (id: string) => {
      parentUnregister(id);
      unregisterItem(id);
    },
    [parentUnregister, unregisterItem],
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
