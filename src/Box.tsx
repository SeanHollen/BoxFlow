import { useContext, useId, useLayoutEffect, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode, UIEvent } from "react";
import { BoxContext, useBoxContext, useChildRects } from "./context.js";
import { DebugContext, deadSpaceStyle, debugOutline, snapshotProps } from "./debug.js";
import type { DebugKind, DebugOverride } from "./debug.js";
import { borderStrips } from "./borderStrips.js";
import {
  ZERO_RECT,
  ZERO_VEC,
  anchorFromFraction,
  attachFor,
  borderInset,
  borderToCss,
  childReach,
  childTotalsFromRects,
  clampAxis,
  computeTopLeft,
  computeZRanks,
  overflowToCss,
  pivotFraction,
  previousRect,
  resolveSizing,
  vecFrom,
  sizeValues,
} from "./layout.js";
import type {
  AxisSize,
  BoxBorder,
  BoxContextValue,
  BoxOverflow,
  ChildAnchor,
  ChildRect,
  PaintStyle,
  PivotSpec,
  RelativeTo,
  SizeSpec,
  StackMode,
  Vec2,
  Vec2Input,
  ZSort,
  PointerHandlers,
} from "./types.js";
import { pickPointerHandlers, pointerEventsValue } from "./types.js";

export interface BoxBaseProps extends PointerHandlers<HTMLDivElement> {
  position?: Vec2Input;
  pivot?: PivotSpec;
  stackMode?: StackMode;
  relativeTo?: RelativeTo;
  overflow?: BoxOverflow;
  border?: BoxBorder;
  zValue?: unknown;
  zSort?: ZSort;
  rotate?: number;
  sticky?: boolean;
  clickThrough?: boolean;
  name?: string;
  style?: PaintStyle;
  dangerousPositionStyles?: CSSProperties;
  children?: ReactNode;
  debugKind?: DebugKind;
  internalStyle?: CSSProperties;
}

function mergeAxisOverride(
  axis: number | "(function)" | undefined,
  original: AxisSize | undefined,
): AxisSize | undefined {
  return axis === "(function)" ? original : axis;
}

function mergeSizeOverride(ov: DebugOverride["size"], original: SizeSpec): SizeSpec {
  if (ov === undefined || ov === "(function)") return original;
  const base = typeof original === "function" ? undefined : original;
  return {
    ...ov,
    x: mergeAxisOverride(ov.x, base?.x),
    y: mergeAxisOverride(ov.y, base?.y),
  };
}

export interface BoxProps extends BoxBaseProps {
  size?: SizeSpec;
}

export function useReferenceRect(
  id: string,
  relativeTo: RelativeTo | undefined,
  stackMode: StackMode | undefined,
): ChildRect {
  const parent = useBoxContext();
  const relative = relativeTo ?? (stackMode ? "siblings" : "parent");
  if (relative === "siblings") {
    return previousRect(parent.childRects, id) ?? ZERO_RECT;
  }
  return {
    left: 0,
    top: 0,
    right: parent.resolvedInnerSize.x,
    bottom: parent.resolvedInnerSize.y,
  };
}

interface EffectiveLayout {
  position: Vec2;
  size: SizeSpec;
  pivot: PivotSpec | undefined;
  stackMode: StackMode | undefined;
  relativeTo: RelativeTo | undefined;
  overflow: BoxOverflow | undefined;
  border: BoxBorder | undefined;
  rotate: number | undefined;
}

function mergeOverride(props: BoxProps, override: DebugOverride | undefined): EffectiveLayout {
  let pivot = props.pivot;
  let stackMode = props.stackMode;
  if (override?.pivot) {
    pivot = override.pivot;
    stackMode = undefined;
  } else if (override?.stackMode) {
    stackMode = override.stackMode;
    pivot = undefined;
  }
  const size = mergeSizeOverride(override?.size, props.size ?? {});
  return {
    position: vecFrom(override?.position ?? props.position),
    size,
    pivot,
    stackMode,
    relativeTo: override?.relativeTo ?? props.relativeTo,
    overflow: override?.overflow ?? props.overflow,
    border: override?.border ?? props.border,
    rotate: override?.rotate ?? props.rotate,
  };
}

export function Box(props: BoxProps) {
  const { style, dangerousPositionStyles, internalStyle, children, debugKind, zValue } = props;
  const parent = useBoxContext();
  const id = useId();
  const debug = useContext(DebugContext);
  const { childRects, childZ, registerChild, unregisterChild, registerZ, unregisterZ } =
    useChildRects();
  const [scrollOffset, setScrollOffset] = useState<Vec2>(ZERO_VEC);

  const { position, size, pivot, stackMode, relativeTo, overflow, border, rotate } = mergeOverride(
    props,
    debug?.overrides[id],
  );

  const { from, to } = attachFor(pivot, stackMode);
  const reference = useReferenceRect(id, relativeTo, stackMode);
  const totals = childTotalsFromRects(childRects);
  const sizing = resolveSizing(size, totals);
  const minResolved = sizing.min;
  const maxResolved = sizing.max;
  const flipX = sizing.size.x < 0;
  const flipY = sizing.size.y < 0;
  const resolved = {
    x: clampAxis(Math.abs(sizing.size.x), undefined, maxResolved.x),
    y: clampAxis(Math.abs(sizing.size.y), undefined, maxResolved.y),
  };
  const transformParts: string[] = [];
  if (rotate !== undefined && rotate !== 0) transformParts.push(`rotate(${rotate}deg)`);
  if (flipX) transformParts.push("scaleX(-1)");
  if (flipY) transformParts.push("scaleY(-1)");
  const paintTransform = transformParts.length > 0 ? transformParts.join(" ") : undefined;
  const topLeft = computeTopLeft({ from, to, position, size: resolved, reference });

  const insets = borderInset(border);
  const insetX = insets.left + insets.right;
  const insetY = insets.top + insets.bottom;
  const values = sizeValues(size);
  const valueX = values.x;
  const valueY = values.y;
  const resolvedX = resolved.x;
  const resolvedY = resolved.y;
  const flooredX = clampAxis(resolvedX, minResolved.x, undefined);
  const flooredY = clampAxis(resolvedY, minResolved.y, undefined);
  const isSticky = props.sticky === true;
  const topLeftX = isSticky ? position.x : topLeft.x;
  const topLeftY = isSticky ? position.y : topLeft.y;
  const value: BoxContextValue = {
    size: {
      x: typeof valueX === "number" ? clampAxis(valueX, minResolved.x, maxResolved.x) : valueX,
      y: typeof valueY === "number" ? clampAxis(valueY, minResolved.y, maxResolved.y) : valueY,
    },
    innerSizeValues: {
      x:
        typeof valueX === "number"
          ? Math.max(0, clampAxis(valueX, minResolved.x, maxResolved.x) - insetX)
          : valueX,
      y:
        typeof valueY === "number"
          ? Math.max(0, clampAxis(valueY, minResolved.y, maxResolved.y) - insetY)
          : valueY,
    },
    resolvedInnerSize: {
      x: Math.max(0, flooredX - insetX),
      y: Math.max(0, flooredY - insetY),
    },
    childRects,
    zRanks: computeZRanks(childZ, props.zSort),
    scrollOffset,
    registerChild,
    unregisterChild,
    registerZ,
    unregisterZ,
  };

  const relative = relativeTo ?? (stackMode ? "siblings" : "parent");
  const predecessor = relative === "siblings" ? previousRect(parent.childRects, id) : undefined;
  let anchorX: ChildAnchor;
  let anchorY: ChildAnchor;
  if (relative === "siblings") {
    anchorX = predecessor?.anchorX ?? "start";
    anchorY = predecessor?.anchorY ?? "start";
  } else {
    anchorX = anchorFromFraction(pivotFraction(from).x);
    anchorY = anchorFromFraction(pivotFraction(from).y);
  }
  const reachX = childReach(anchorX, topLeftX, resolvedX, parent.resolvedInnerSize.x);
  const reachY = childReach(anchorY, topLeftY, resolvedY, parent.resolvedInnerSize.y);

  const { registerChild: parentRegister, unregisterChild: parentUnregister } = parent;
  useLayoutEffect(() => {
    parentRegister(id, {
      left: topLeftX,
      top: topLeftY,
      right: topLeftX + resolvedX,
      bottom: topLeftY + resolvedY,
      anchorX,
      anchorY,
      reachX,
      reachY,
    });
  }, [
    id,
    parentRegister,
    topLeftX,
    topLeftY,
    resolvedX,
    resolvedY,
    anchorX,
    anchorY,
    reachX,
    reachY,
  ]);
  useLayoutEffect(() => () => parentUnregister(id), [id, parentUnregister]);

  const { registerZ: parentRegisterZ, unregisterZ: parentUnregisterZ } = parent;
  useLayoutEffect(() => {
    if (zValue === undefined) return;
    parentRegisterZ(id, zValue);
    return () => parentUnregisterZ(id);
  }, [id, zValue, parentRegisterZ, parentUnregisterZ]);

  const kind = debugKind ?? "box";
  const pointerHandlers = pickPointerHandlers(props);
  const handleClick =
    debug?.open === true
      ? (event: MouseEvent<HTMLDivElement>) => {
          event.stopPropagation();
          debug.select({
            id,
            kind,
            name: props.name ?? (typeof children === "string" ? children : undefined),
            snapshot: snapshotProps({
              position,
              size,
              pivot,
              relativeTo,
              stackMode,
              overflow,
              border,
              rotate,
            }),
          });
        }
      : undefined;

  const scrollable =
    overflow?.x === "scrollbar" ||
    overflow?.y === "scrollbar" ||
    overflow?.x === "auto" ||
    overflow?.y === "auto";
  const handleScroll = scrollable
    ? (event: UIEvent<HTMLDivElement>) =>
        setScrollOffset({
          x: event.currentTarget.scrollLeft,
          y: event.currentTarget.scrollTop,
        })
    : undefined;

  return (
    <BoxContext.Provider value={value}>
      <div
        data-bc-kind={kind}
        data-bc-name={props.name}
        {...pointerHandlers}
        onClick={handleClick ?? pointerHandlers.onClick}
        onScroll={handleScroll}
        style={{
          ...(pointerHandlers.onClick ? { cursor: "pointer" as const } : undefined),
          pointerEvents: pointerEventsValue(props.clickThrough, props),
          ...style,
          ...internalStyle,
          ...(isSticky
            ? { position: "sticky" as const, top: topLeftY, marginLeft: topLeftX }
            : { position: "absolute" as const, left: topLeftX, top: topLeftY }),
          width: resolvedX,
          height: resolvedY,
          zIndex: parent.zRanks.get(id),
          transform: paintTransform,
          boxSizing: "border-box",
          ...borderToCss(border),
          ...overflowToCss(overflow),
          ...dangerousPositionStyles,
          ...deadSpaceStyle(debug, kind, values, resolved, childRects),
          ...debugOutline(debug, id, kind),
        }}
      >
        {children}
        {borderStrips(border)}
      </div>
    </BoxContext.Provider>
  );
}
