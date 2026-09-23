import type { CSSProperties, ReactNode } from "react";
import type { PaintStyle, Vec2 } from "./types";

export interface InsetProps {
  size: Vec2;
  side?: "left" | "right";
  margin?: number;
  src?: string;
  alt?: string;
  style?: PaintStyle;
  children?: ReactNode;
}

export function Inset({ size, side = "left", margin = 8, src, alt, style, children }: InsetProps) {
  const marginStyle: CSSProperties =
    side === "left"
      ? { marginRight: margin, marginBottom: margin }
      : { marginLeft: margin, marginBottom: margin };
  return (
    <span
      style={{
        ...style,
        float: side,
        width: size.x,
        height: size.y,
        ...marginStyle,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? ""}
          draggable={false}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      ) : (
        children
      )}
    </span>
  );
}
