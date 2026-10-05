import type { CSSProperties, ReactNode } from "react";
import type { Vec2 } from "./types.js";

export interface GridOptions {
  step?: number;
}

const LINE_MAJOR = "rgba(26, 115, 232, 0.28)";
const LINE_MINOR = "rgba(26, 115, 232, 0.08)";
const LABEL_COLOR = "rgba(26, 115, 232, 0.75)";

function labelStyle(axis: "x" | "y", at: number): CSSProperties {
  const base: CSSProperties = {
    position: "absolute",
    fontFamily: "system-ui, sans-serif",
    fontSize: 8,
    lineHeight: 1,
    color: LABEL_COLOR,
  };
  if (axis === "x") return { ...base, left: at + 2, top: 2 };
  return { ...base, left: 2, top: at + 2 };
}

export function GridOverlay({ size, options }: { size: Vec2; options: GridOptions }) {
  const step = options.step ?? 100;
  const minor = step / 10;
  const labels: ReactNode[] = [];
  for (let x = step; x < size.x; x += step) {
    labels.push(
      <span key={`x${x}`} style={labelStyle("x", x)}>
        {x}
      </span>,
    );
  }
  for (let y = step; y < size.y; y += step) {
    labels.push(
      <span key={`y${y}`} style={labelStyle("y", y)}>
        {y}
      </span>,
    );
  }
  const line = (direction: string, color: string, at: number) =>
    `repeating-linear-gradient(${direction}, ${color} 0 1px, transparent 1px ${at}px)`;
  return (
    <div
      data-bc-grid=""
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: size.x,
        height: size.y,
        pointerEvents: "none",
        zIndex: 99999,
        backgroundImage: [
          line("to right", LINE_MAJOR, step),
          line("to bottom", LINE_MAJOR, step),
          line("to right", LINE_MINOR, minor),
          line("to bottom", LINE_MINOR, minor),
        ].join(", "),
      }}
    >
      {labels}
    </div>
  );
}
