import type { CSSProperties, ReactNode } from "react";
import { borderEdge, borderSides } from "./layout.js";
import type { BoxBorder } from "./types.js";

export function borderStrips(border: BoxBorder | undefined): ReactNode {
  const sides = border && border.overlay !== false ? borderSides(border) : undefined;
  if (!border || !sides) return undefined;
  const half = -border.width / 2;
  const edge = borderEdge(border);
  return sides.map((side) => {
    const horizontal = side === "top" || side === "bottom";
    const placement: CSSProperties = horizontal
      ? { left: half, right: half, [side]: half, borderTop: edge }
      : { top: half, bottom: half, [side]: half, borderLeft: edge };
    return (
      <div
        key={side}
        data-bc-border={side}
        style={{
          position: "absolute",
          pointerEvents: "none",
          boxSizing: "content-box",
          ...placement,
        }}
      />
    );
  });
}
