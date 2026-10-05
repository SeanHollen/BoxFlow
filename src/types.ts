import type { CSSProperties, MouseEventHandler, PointerEventHandler } from "react";

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

export interface HoverHandlers<T extends Element = Element> {
  onEnter?: PointerEventHandler<T>;
  onLeave?: PointerEventHandler<T>;
  onMove?: PointerEventHandler<T>;
}

export interface PointerHandlers<T extends Element = Element> {
  hover?: HoverHandlers<T>;
  onPointerDown?: PointerEventHandler<T>;
  onPointerUp?: PointerEventHandler<T>;
  onClick?: MouseEventHandler<T>;
}

export interface ElementPointerProps<T extends Element = Element> {
  onPointerEnter?: PointerEventHandler<T>;
  onPointerLeave?: PointerEventHandler<T>;
  onPointerMove?: PointerEventHandler<T>;
  onPointerDown?: PointerEventHandler<T>;
  onPointerUp?: PointerEventHandler<T>;
  onClick?: MouseEventHandler<T>;
}

export function pickPointerHandlers<T extends Element>(
  props: PointerHandlers<T>,
): ElementPointerProps<T> {
  const picked: ElementPointerProps<T> = {};
  if (props.hover?.onEnter) picked.onPointerEnter = props.hover.onEnter;
  if (props.hover?.onLeave) picked.onPointerLeave = props.hover.onLeave;
  if (props.hover?.onMove) picked.onPointerMove = props.hover.onMove;
  if (props.onPointerDown) picked.onPointerDown = props.onPointerDown;
  if (props.onPointerUp) picked.onPointerUp = props.onPointerUp;
  if (props.onClick) picked.onClick = props.onClick;
  return picked;
}

export function pointerEventsValue(
  clickThrough: boolean | undefined,
  props: PointerHandlers<never>,
): "none" | "auto" | undefined {
  if (clickThrough === true) return "none";
  return hasPointerHandlers(props) ? "auto" : undefined;
}

export function hasPointerHandlers(props: PointerHandlers<never>): boolean {
  return Object.keys(pickPointerHandlers(props)).length > 0;
}

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

export interface Vec2Input {
  x?: number;
  y?: number;
}

export type PivotSpec = Pivot | PivotPair;

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

export type BorderSide = "top" | "right" | "bottom" | "left";

export interface BoxBorder {
  width: number;
  color?: string;
  style?: "solid" | "dashed" | "dotted" | "double";
  overlay?: boolean;
  sides?: BorderSide | readonly BorderSide[];
}

export type AxisSizeSpec = number | "childTotals";

export type SizeLimit = "childTotals" | { x?: AxisSizeSpec; y?: AxisSizeSpec };

export type AxisSize = number | ((total: number) => number);

export interface SizeObject {
  x?: AxisSize;
  y?: AxisSize;
  min?: SizeLimit;
  max?: SizeLimit;
}

export interface SizeResult {
  x: number;
  y: number;
  min?: { x?: number; y?: number };
  max?: { x?: number; y?: number };
}

export type SizeSpec = SizeObject | ((xChildTotal: number, yChildTotal: number) => SizeResult);

export interface SizeValues {
  x: AxisSizeSpec;
  y: AxisSizeSpec;
}

export interface ShapeStroke {
  width?: number;
  color?: string;
  cap?: "butt" | "round" | "square";
  dash?: readonly number[];
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

export type ParentAxis = { kind: "pixels"; value: number } | { kind: "childTotals" };

export interface ParentSize {
  x: ParentAxis;
  y: ParentAxis;
}

export interface ParentBoxProps {
  size: ParentSize;
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
