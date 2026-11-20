import { useId, useLayoutEffect } from "react";
import type { RefObject } from "react";
import { useBoxContext } from "./context.js";

export function useContentRect(
  width: number,
  height: number,
  elementRef: RefObject<Element | null>,
) {
  const id = useId();
  const { registerChild, unregisterChild } = useBoxContext();
  useLayoutEffect(() => {
    registerChild(
      id,
      {
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        anchorX: "start",
        anchorY: "start",
        reachX: width,
        reachY: height,
      },
      elementRef.current ?? undefined,
    );
  }, [id, registerChild, width, height, elementRef]);
  useLayoutEffect(() => () => unregisterChild(id), [id, unregisterChild]);
}
