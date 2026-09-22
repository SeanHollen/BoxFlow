import { useContext, useId, useLayoutEffect, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode, UIEvent } from "react";
import { BoxContext, useBoxContext, useChildRects } from "./context";
import { DebugContext, deadSpaceStyle, debugOutline, snapshotProps } from "./debug";
import type { DebugKind, DebugOverride } from "./debug";
import {
  ZERO_RECT,
  ZERO_VEC,
  anchorFromFraction,
  attachFor,
  borderToCss,
  childReach,
  childTotalsFromRects,
  clampAxis,
  computeTopLeft,
  computeZRanks,
  overflowToCss,
  pivotFraction,
  previousRect,
  resolveLimit,
  resolveSize,
  sizeLimits,
  sizeValues,
} from "./layout";
import type {
  BoxBorder,
  BoxContextValue,
  BoxOverflow,
  ChildAnchor,
  ChildRect,
  PaintStyle,
  PivotPair,
  RelativeTo,
  SizeSpec,
  StackMode,
  Vec2,
  ZSort,
} from "./types";

export interface BoxBaseProps {
  position?: Vec2;
  pivot?: PivotPair;
  stackMode?: StackMode;
  relativeTo?: RelativeTo;
  overflow?: BoxOverflow;
  border?: BoxBorder;
  zValue?: unknown;
  zSort?: ZSort;
  sticky?: boolean;
  name?: string;
  style?: PaintStyle;
  dangerousPositionStyles?: CSSProperties;
  children?: ReactNode;
  debugKind?: DebugKind;
  internalStyle?: CSSProperties;
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
  pivot: PivotPair | undefined;
  stackMode: StackMode | undefined;
  relativeTo: RelativeTo | undefined;
  overflow: BoxOverflow | undefined;
  border: BoxBorder | undefined;
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
  const size =
    override?.size !== undefined && override.size !== "(function)"
      ? override.size
      : (props.size ?? "childTotals");
  return {
    position: override?.position ?? props.position ?? ZERO_VEC,
    size,
    pivot,
    stackMode,
    relativeTo: override?.relativeTo ?? props.relativeTo,
    overflow: override?.overflow ?? props.overflow,
    border: override?.border ?? props.border,
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

  const { position, size, pivot, stackMode, relativeTo, overflow, border } = mergeOverride(
    props,
    debug?.overrides[id],
  );

  const { from, to } = attachFor(pivot, stackMode);
  const reference = useReferenceRect(id, relativeTo, stackMode);
  const totals = childTotalsFromRects(childRects);
  const raw = resolveSize(size, totals);
  const limits = sizeLimits(size);
  const minResolved = resolveLimit(limits.min, totals);
  const maxResolved = resolveLimit(limits.max, totals);
  const resolved = {
    x: clampAxis(raw.x, undefined, maxResolved.x),
    y: clampAxis(raw.y, undefined, maxResolved.y),
  };
  const topLeft = computeTopLeft({ from, to, position, size: resolved, reference });

  const borderWidth = border?.width ?? 0;
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
          ? Math.max(0, clampAxis(valueX, minResolved.x, maxResolved.x) - 2 * borderWidth)
          : valueX,
      y:
        typeof valueY === "number"
          ? Math.max(0, clampAxis(valueY, minResolved.y, maxResolved.y) - 2 * borderWidth)
          : valueY,
    },
    resolvedInnerSize: {
      x: Math.max(0, flooredX - 2 * borderWidth),
      y: Math.max(0, flooredY - 2 * borderWidth),
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
  const handleClick =
    debug?.open === true
      ? (event: MouseEvent) => {
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
        onClick={handleClick}
        onScroll={handleScroll}
        style={{
          ...style,
          ...internalStyle,
          ...(isSticky
            ? { position: "sticky" as const, top: topLeftY, marginLeft: topLeftX }
            : { position: "absolute" as const, left: topLeftX, top: topLeftY }),
          width: resolvedX,
          height: resolvedY,
          zIndex: parent.zRanks.get(id),
          boxSizing: "border-box",
          ...borderToCss(border),
          ...overflowToCss(overflow),
          ...dangerousPositionStyles,
          ...deadSpaceStyle(debug, kind, values, resolved, childRects),
          ...debugOutline(debug, id, kind),
        }}
      >
        {children}
      </div>
    </BoxContext.Provider>
  );
}
