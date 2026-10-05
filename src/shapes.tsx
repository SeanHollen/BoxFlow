import { useId, useLayoutEffect } from "react";
import type { CSSProperties } from "react";
import { useBoxContext } from "./context.js";
import type { PointerHandlers, ShapeStroke, Vec2 } from "./types.js";
import { hasPointerHandlers, pickPointerHandlers } from "./types.js";

export interface LineProps extends PointerHandlers<SVGLineElement> {
  from: Vec2;
  to: Vec2;
  stroke?: ShapeStroke | "none";
  zValue?: unknown;
  name?: string;
}

export interface PolygonProps extends PointerHandlers<SVGPolygonElement> {
  points: Vec2[];
  stroke?: ShapeStroke | "none";
  fill?: string;
  zValue?: unknown;
  name?: string;
}

export interface EllipseProps extends PointerHandlers<SVGEllipseElement> {
  center: Vec2;
  radius: number | Vec2;
  stroke?: ShapeStroke | "none";
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

function shapeFrame(points: readonly Vec2[], stroke: ShapeStroke | "none" | undefined): ShapeFrame {
  const pad = stroke === "none" ? 0 : Math.max(stroke?.width ?? 1, 1);
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

// The svg frame is always inert so its empty bounding box never catches the
// pointer. When handlers are given, the drawn element itself opts in with
// pointer-events="visible", which hit-tests fill and stroke geometry
// regardless of whether either is painted.
function pointerAttrs<T extends Element>(props: PointerHandlers<T>) {
  if (!hasPointerHandlers(props)) return {};
  return {
    pointerEvents: "visible" as const,
    ...(props.onClick ? { style: { cursor: "pointer" as const } } : undefined),
    ...pickPointerHandlers(props),
  };
}

function strokeAttrs(stroke: ShapeStroke | "none" | undefined) {
  if (stroke === "none") return { stroke: "none" };
  return {
    stroke: stroke?.color ?? "currentColor",
    strokeWidth: stroke?.width ?? 1,
    strokeLinecap: stroke?.cap,
    strokeDasharray: stroke?.dash?.join(" "),
  };
}

export function Line(props: LineProps) {
  const { from, to, stroke, zValue, name } = props;
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
        {...pointerAttrs(props)}
      />
    </svg>
  );
}

export function Ellipse(props: EllipseProps) {
  const { center, radius, stroke, fill, zValue, name } = props;
  const id = useId();
  const zIndex = useShapeZ(id, zValue);
  const r = typeof radius === "number" ? { x: radius, y: radius } : radius;
  const { style, offset } = shapeFrame(
    [
      { x: center.x - r.x, y: center.y - r.y },
      { x: center.x + r.x, y: center.y + r.y },
    ],
    stroke,
  );
  return (
    <svg data-bc-kind="ellipse" data-bc-name={name} style={{ ...style, zIndex }}>
      <ellipse
        cx={center.x + offset.x}
        cy={center.y + offset.y}
        rx={r.x}
        ry={r.y}
        fill={fill ?? "none"}
        {...strokeAttrs(stroke)}
        {...pointerAttrs(props)}
      />
    </svg>
  );
}

export function Polygon(props: PolygonProps) {
  const { points, stroke, fill, zValue, name } = props;
  const id = useId();
  const zIndex = useShapeZ(id, zValue);
  const { style, offset } = shapeFrame(points, stroke);
  const pointList = points.map((p) => `${p.x + offset.x},${p.y + offset.y}`).join(" ");
  return (
    <svg data-bc-kind="polygon" data-bc-name={name} style={{ ...style, zIndex }}>
      <polygon
        points={pointList}
        fill={fill ?? "none"}
        {...strokeAttrs(stroke)}
        {...pointerAttrs(props)}
      />
    </svg>
  );
}
