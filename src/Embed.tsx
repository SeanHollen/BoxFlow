import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useBoxContext } from "./context.js";
import { useContentRect } from "./contentRect.js";
import type { Vec2 } from "./types.js";

export interface EmbedProps {
  children?: ReactNode;
}

export function Embed({ children }: EmbedProps) {
  const parent = useBoxContext();
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Vec2 | undefined>(undefined);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setMeasured((prev) =>
        prev && prev.x === el.offsetWidth && prev.y === el.offsetHeight
          ? prev
          : { x: el.offsetWidth, y: el.offsetHeight },
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useContentRect(measured?.x ?? 0, measured?.y ?? 0, ref);

  const parentWidth = parent.innerSizeValues.x;
  return (
    <div
      ref={ref}
      data-boxflow-kind="embed"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "max-content",
        maxWidth: parentWidth === "childTotals" ? undefined : parentWidth,
      }}
    >
      {children}
    </div>
  );
}
