import { useContext, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { Box, useReferenceRect } from "./Box.js";
import type { BoxBaseProps } from "./Box.js";
import { BoxContext, useBoxContext, useChildRects } from "./context.js";
import { DebugContext, debugOutline, snapshotProps } from "./debug.js";
import { borderStrips } from "./borderStrips.js";
import {
  ZERO_VEC,
  anchorFromFraction,
  attachFor,
  borderInset,
  borderToCss,
  childReach,
  computeZRanks,
  fontToCss,
  overflowToCss,
  pivotFraction,
  previousRect,
  vecFrom,
} from "./layout.js";
import { fontBaselineOffset } from "./metrics.js";
import { pickPointerHandlers, pointerEventsValue } from "./types.js";
import type { BoxContextValue, ChildAnchor, TextFont, Vec2 } from "./types.js";

export interface BoxTextSize {
  x?: number;
  y?: number;
}

export interface BoxTextProps extends BoxBaseProps {
  size?: BoxTextSize;
  font?: TextFont;
  baseline?: boolean;
}

export function BoxText({ font, size, style, children, baseline, ...boxProps }: BoxTextProps) {
  const sx = size?.x;
  const sy = size?.y;
  const basePosition = vecFrom(boxProps.position);
  const position = baseline
    ? { x: basePosition.x, y: basePosition.y - fontBaselineOffset(font) }
    : basePosition;
  if (sx !== undefined && sy !== undefined) {
    return (
      <Box
        {...boxProps}
        position={position}
        debugKind="text"
        size={{ x: sx, y: sy }}
        style={style}
        internalStyle={{ ...fontToCss(font), display: "flow-root" }}
      >
        {children}
      </Box>
    );
  }
  return (
    <IntrinsicText
      {...boxProps}
      position={position}
      font={font}
      sizeX={sx}
      sizeY={sy}
      style={style}
    >
      {children}
    </IntrinsicText>
  );
}

interface IntrinsicBoxTextProps extends BoxBaseProps {
  font?: TextFont;
  sizeX?: number;
  sizeY?: number;
}

function IntrinsicText(props: IntrinsicBoxTextProps) {
  const { style, children, font } = props;
  const pointerHandlers = pickPointerHandlers(props);
  const parent = useBoxContext();
  const id = useId();
  const debug = useContext(DebugContext);
  const ref = useRef<HTMLDivElement>(null);
  const [searchedWidth, setSearchedWidth] = useState<number | undefined>(undefined);
  const [measured, setMeasured] = useState<Vec2 | undefined>(undefined);

  const override = debug?.overrides[id];
  const position = vecFrom(override?.position ?? props.position);
  let pivot = props.pivot;
  let stackMode = props.stackMode;
  if (override?.pivot) {
    pivot = override.pivot;
    stackMode = undefined;
  } else if (override?.stackMode) {
    stackMode = override.stackMode;
    pivot = undefined;
  }
  const relativeTo = override?.relativeTo ?? props.relativeTo;
  const overflow = override?.overflow ?? props.overflow;
  const border = override?.border ?? props.border;
  let sizeX = props.sizeX;
  let sizeY = props.sizeY;
  if (override?.size && typeof override.size === "object") {
    if (typeof override.size.x === "number") sizeX = override.size.x;
    if (typeof override.size.y === "number") sizeY = override.size.y;
  }
  const rotate = override?.rotate ?? props.rotate;
  const flipX = sizeX !== undefined && sizeX < 0;
  const flipY = sizeY !== undefined && sizeY < 0;
  if (sizeX !== undefined) sizeX = Math.abs(sizeX);
  if (sizeY !== undefined) sizeY = Math.abs(sizeY);

  const { from, to } = attachFor(pivot, stackMode);
  const reference = useReferenceRect(id, relativeTo, stackMode);
  const anchor = pivotFraction(from);
  const own = pivotFraction(to);
  const left = reference.left + anchor.x * (reference.right - reference.left) + position.x;
  const top = reference.top + anchor.y * (reference.bottom - reference.top) + position.y;

  const fontSize = font?.size;
  const fontFamily = font?.family;
  const fontLineHeight = font?.lineHeight;
  useLayoutEffect(() => {
    if (sizeY === undefined || sizeX !== undefined) return;
    const el = ref.current;
    if (!el) return;
    const previous = el.style.width;
    const fitsAt = (w: number) => {
      el.style.width = `${w}px`;
      return el.scrollHeight <= sizeY;
    };
    el.style.width = "max-content";
    const widest = Math.ceil(el.scrollWidth);
    if (widest <= 0) {
      el.style.width = previous;
      return;
    }
    el.style.width = "min-content";
    let lo = Math.ceil(el.scrollWidth);
    let hi = widest;
    if (!fitsAt(lo)) {
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (fitsAt(mid)) {
          hi = mid;
        } else {
          lo = mid + 1;
        }
      }
    }
    el.style.width = previous;
    setSearchedWidth(lo);
  }, [sizeX, sizeY, children, fontSize, fontFamily, fontLineHeight]);

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

  const width = sizeX ?? measured?.x ?? 0;
  const height = sizeY ?? measured?.y ?? 0;
  const rectLeft = left - own.x * width;
  const rectTop = top - own.y * height;

  const relative = relativeTo ?? (stackMode ? "siblings" : "parent");
  const predecessor = relative === "siblings" ? previousRect(parent.childRects, id) : undefined;
  let anchorX: ChildAnchor;
  let anchorY: ChildAnchor;
  if (relative === "siblings") {
    anchorX = predecessor?.anchorX ?? "start";
    anchorY = predecessor?.anchorY ?? "start";
  } else {
    anchorX = anchorFromFraction(anchor.x);
    anchorY = anchorFromFraction(anchor.y);
  }
  const reachX = childReach(anchorX, rectLeft, width, parent.resolvedInnerSize.x);
  const reachY = childReach(anchorY, rectTop, height, parent.resolvedInnerSize.y);

  const { registerChild: parentRegister, unregisterChild: parentUnregister } = parent;
  useLayoutEffect(() => {
    parentRegister(id, {
      left: rectLeft,
      top: rectTop,
      right: rectLeft + width,
      bottom: rectTop + height,
      anchorX,
      anchorY,
      reachX,
      reachY,
    });
  }, [id, parentRegister, rectLeft, rectTop, width, height, anchorX, anchorY, reachX, reachY]);
  useLayoutEffect(() => () => parentUnregister(id), [id, parentUnregister]);

  const { registerZ: parentRegisterZ, unregisterZ: parentUnregisterZ } = parent;
  const zValue = props.zValue;
  useLayoutEffect(() => {
    if (zValue === undefined) return;
    parentRegisterZ(id, zValue);
    return () => parentUnregisterZ(id);
  }, [id, zValue, parentRegisterZ, parentUnregisterZ]);

  const { childRects, childZ, registerChild, unregisterChild, registerZ, unregisterZ } =
    useChildRects();
  const insets = borderInset(border);
  const insetX = insets.left + insets.right;
  const insetY = insets.top + insets.bottom;
  const value = useMemo<BoxContextValue>(
    () => ({
      size: { x: width, y: height },
      innerSizeValues: {
        x: Math.max(0, width - insetX),
        y: Math.max(0, height - insetY),
      },
      resolvedInnerSize: {
        x: Math.max(0, width - insetX),
        y: Math.max(0, height - insetY),
      },
      childRects,
      zRanks: computeZRanks(childZ, props.zSort),
      scrollOffset: ZERO_VEC,
      registerChild,
      unregisterChild,
      registerZ,
      unregisterZ,
    }),
    [
      width,
      height,
      insetX,
      insetY,
      childRects,
      childZ,
      props.zSort,
      registerChild,
      unregisterChild,
      registerZ,
      unregisterZ,
    ],
  );

  const parentWidthIsChildDriven = parent.innerSizeValues.x === "childTotals";
  let cssWidth: number | "max-content" | undefined = sizeX;
  let cssMaxWidth: number | undefined;
  if (sizeX === undefined && sizeY !== undefined) cssWidth = searchedWidth;
  if (sizeX === undefined && sizeY === undefined) {
    if (parentWidthIsChildDriven) {
      cssWidth = "max-content";
    } else if (own.x !== 0) {
      cssWidth = "max-content";
      cssMaxWidth = parent.resolvedInnerSize.x;
    }
  }
  const transformParts: string[] = [];
  if (own.x !== 0 || own.y !== 0) {
    transformParts.push(`translate(${-own.x * 100}%, ${-own.y * 100}%)`);
  }
  if (rotate !== undefined && rotate !== 0) transformParts.push(`rotate(${rotate}deg)`);
  if (flipX) transformParts.push("scaleX(-1)");
  if (flipY) transformParts.push("scaleY(-1)");
  const transform = transformParts.length > 0 ? transformParts.join(" ") : undefined;

  const layoutStyle: CSSProperties = {
    position: "absolute",
    left,
    top,
    transform,
    width: cssWidth,
    maxWidth: cssMaxWidth,
    height: sizeY,
    zIndex: parent.zRanks.get(id),
    boxSizing: "border-box",
    display: "flow-root",
  };

  const handleClick =
    debug?.open === true
      ? (event: MouseEvent) => {
          event.stopPropagation();
          const snapshotSize =
            sizeX !== undefined || sizeY !== undefined ? { x: sizeX, y: sizeY } : undefined;
          debug.select({
            id,
            kind: "text",
            name: props.name ?? (typeof children === "string" ? children : undefined),
            snapshot: snapshotProps({
              position,
              size: snapshotSize,
              pivot,
              relativeTo,
              stackMode,
              overflow,
              border,
            }),
          });
        }
      : undefined;

  return (
    <BoxContext.Provider value={value}>
      <div
        ref={ref}
        data-bc-kind="text"
        data-bc-name={props.name}
        {...pointerHandlers}
        onClick={handleClick ?? pointerHandlers.onClick}
        style={{
          ...(pointerHandlers.onClick ? { cursor: "pointer" as const } : undefined),
          pointerEvents: pointerEventsValue(props.clickThrough, props),
          ...style,
          ...fontToCss(font),
          ...layoutStyle,
          ...borderToCss(border),
          ...overflowToCss(overflow),
          ...props.dangerousPositionStyles,
          ...debugOutline(debug, id, "text"),
        }}
      >
        {children}
        {borderStrips(border)}
      </div>
    </BoxContext.Provider>
  );
}
