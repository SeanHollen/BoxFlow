import type { CSSProperties } from "react";

export interface Vec2 {
  x: number;
  y: number;
}

export type PaintStyleKey =
  | "background"
  | "backgroundColor"
  | "backgroundImage"
  | "backgroundSize"
  | "backgroundPosition"
  | "backgroundRepeat"
  | "borderRadius"
  | "boxShadow"
  | "opacity"
  | "outline"
  | "outlineOffset"
  | "color"
  | "cursor"
  | "pointerEvents"
  | "visibility"
  | "filter"
  | "backdropFilter"
  | "mixBlendMode"
  | "transition";

export type PaintStyle = Pick<CSSProperties, PaintStyleKey>;

export type Pivot =
  | "topLeft"
  | "topCenter"
  | "topRight"
  | "centerLeft"
  | "center"
  | "centerRight"
  | "bottomLeft"
  | "bottomCenter"
  | "bottomRight";

export interface PivotPair {
  from?: Pivot;
  to?: Pivot;
}

export type RelativeTo = "parent" | "siblings";

export type StackMode = "vertical" | "horizontal" | "verticalReverse" | "horizontalReverse";

export type OverflowMode = "visible" | "clip" | "scrollbar" | "auto" | "ellipsis";

export interface BoxOverflow {
  x?: OverflowMode;
  y?: OverflowMode;
}

export type TextStyle = "bold" | "italic" | "underline" | "strikethrough";

export interface TextFont {
  family?: string;
  size?: number;
  weight?: number | "normal" | "bold";
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
  style?: TextStyle | TextStyle[];
  align?: "left" | "center" | "right";
}

export interface BoxBorder {
  width: number;
  color?: string;
  style?: "solid" | "dashed" | "dotted" | "double";
}

export type AxisSizeSpec = number | "childTotals";

export type SizeLimit = "childTotals" | { x?: AxisSizeSpec; y?: AxisSizeSpec };

export interface SizeObject {
  x?: number;
  y?: number;
  min?: SizeLimit;
  max?: SizeLimit;
}

export type SizeSpec = SizeObject | ((xChildTotal: number, yChildTotal: number) => Vec2);

export interface SizeValues {
  x: AxisSizeSpec;
  y: AxisSizeSpec;
}

export type ChildAnchor = "start" | "center" | "end";

export interface ChildRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  anchorX?: ChildAnchor;
  anchorY?: ChildAnchor;
  reachX?: number;
  reachY?: number;
}

export interface ParentBoxProps {
  size: SizeValues;
}

export type ZSort = (a: unknown, b: unknown) => number;

export interface BoxContextValue {
  size: SizeValues;
  innerSizeValues: SizeValues;
  resolvedInnerSize: Vec2;
  childRects: ReadonlyMap<string, ChildRect>;
  zRanks: ReadonlyMap<string, number>;
  scrollOffset: Vec2;
  registerChild: (id: string, rect: ChildRect) => void;
  unregisterChild: (id: string) => void;
  registerZ: (id: string, zValue: unknown) => void;
  unregisterZ: (id: string) => void;
}
