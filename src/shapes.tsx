import { useId, useLayoutEffect } from "react";
import type { CSSProperties } from "react";
import { useBoxContext } from "./context";
import type { ShapeStroke, Vec2 } from "./types";

export interface LineProps {
  from: Vec2;
  to: Vec2;
  stroke?: ShapeStroke;
  zValue?: unknown;
  name?: string;
}

export interface PolygonProps {
  points: Vec2[];
  stroke?: ShapeStroke;
  fill?: string;
  zValue?: unknown;
  name?: string;
}

interface ShapeFrame {
  style: CSSProperties;
  offset: Vec2;
}

function useShapeZ(id: string, zValue: unknown): number | undefined {
  const { zRanks, registerZ, unregisterZ } = useBoxContext();
  useLayoutEffect(() => {
    if (zValue === undefined) return;
    registerZ(id, zValue);
    return () => unregisterZ(id);
  }, [id, zValue, registerZ, unregisterZ]);
  return zRanks.get(id);
}

function shapeFrame(points: readonly Vec2[], stroke: ShapeStroke | undefined): ShapeFrame {
  const pad = Math.max(stroke?.width ?? 1, 1);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const style: CSSProperties = {
    position: "absolute",
    left: minX - pad,
    top: minY - pad,
    width: Math.max(...xs) - minX + 2 * pad,
    height: Math.max(...ys) - minY + 2 * pad,
    overflow: "visible",
    pointerEvents: "none",
  };
  return { style, offset: { x: pad - minX, y: pad - minY } };
}

function strokeAttrs(stroke: ShapeStroke | undefined) {
  return {
    stroke: stroke?.color ?? "currentColor",
    strokeWidth: stroke?.width ?? 1,
    strokeLinecap: stroke?.cap,
    strokeDasharray: stroke?.dash?.join(" "),
  };
}

export function Line({ from, to, stroke, zValue, name }: LineProps) {
  const id = useId();
  const zIndex = useShapeZ(id, zValue);
  const { style, offset } = shapeFrame([from, to], stroke);
  return (
    <svg data-bc-kind="line" data-bc-name={name} style={{ ...style, zIndex }}>
      <line
        x1={from.x + offset.x}
        y1={from.y + offset.y}
        x2={to.x + offset.x}
        y2={to.y + offset.y}
        {...strokeAttrs(stroke)}
      />
    </svg>
  );
}

export function Polygon({ points, stroke, fill, zValue, name }: PolygonProps) {
  const id = useId();
  const zIndex = useShapeZ(id, zValue);
  const { style, offset } = shapeFrame(points, stroke);
  const pointList = points.map((p) => `${p.x + offset.x},${p.y + offset.y}`).join(" ");
  return (
    <svg data-bc-kind="polygon" data-bc-name={name} style={{ ...style, zIndex }}>
      <polygon points={pointList} fill={fill ?? "none"} {...strokeAttrs(stroke)} />
    </svg>
  );
}
