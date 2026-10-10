import { useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { DebugContextValue, DebugOverride } from "./debug.js";
import type { SizeLimit, SizeSpec, Vec2 } from "./types.js";

interface DragStart {
  sx: number;
  sy: number;
  base: Vec2;
}

const handleBase: CSSProperties = {
  position: "absolute",
  width: 10,
  height: 10,
  boxSizing: "border-box",
  backgroundColor: "#fff",
  border: "2px solid #4285f4",
  zIndex: 99998,
  pointerEvents: "auto",
  touchAction: "none",
};

function stop(event: ReactPointerEvent | React.MouseEvent) {
  event.stopPropagation();
}

export function DebugHandles({
  id,
  debug,
  position,
  size,
  resolved,
  own,
}: {
  id: string;
  debug: DebugContextValue;
  position: Vec2;
  size: SizeSpec;
  resolved: Vec2;
  own: Vec2;
}) {
  const posDrag = useRef<DragStart | undefined>(undefined);
  const sizeDrag = useRef<DragStart | undefined>(undefined);

  const wholeFunction = typeof size === "function";
  const xAxis = wholeFunction ? undefined : size.x;
  const yAxis = wholeFunction ? undefined : size.y;
  const resizable = !wholeFunction && (typeof xAxis !== "function" || typeof yAxis !== "function");

  const onPositionDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
    posDrag.current = { sx: event.clientX, sy: event.clientY, base: position };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPositionUp = (event: ReactPointerEvent<HTMLElement>) => {
    posDrag.current = undefined;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const onSizeDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
    sizeDrag.current = { sx: event.clientX, sy: event.clientY, base: resolved };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onSizeUp = (event: ReactPointerEvent<HTMLElement>) => {
    sizeDrag.current = undefined;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const onPositionMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = posDrag.current;
    if (!drag) return;
    debug.setOverride(id, {
      position: {
        x: Math.round(drag.base.x + event.clientX - drag.sx),
        y: Math.round(drag.base.y + event.clientY - drag.sy),
      },
    });
  };

  const onSizeMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = sizeDrag.current;
    if (!drag || wholeFunction) return;
    const patch: NonNullable<Exclude<DebugOverride["size"], "(function)">> = {
      x:
        typeof xAxis === "function"
          ? "(function)"
          : Math.max(0, Math.round(drag.base.x + event.clientX - drag.sx)),
      y:
        typeof yAxis === "function"
          ? "(function)"
          : Math.max(0, Math.round(drag.base.y + event.clientY - drag.sy)),
    };
    if (size.min !== undefined) patch.min = size.min as SizeLimit;
    if (size.max !== undefined) patch.max = size.max as SizeLimit;
    debug.setOverride(id, { size: patch });
  };

  return (
    <>
      <div
        data-bc-handle="position"
        onClick={stop}
        onPointerDown={onPositionDown}
        onPointerMove={onPositionMove}
        onPointerUp={onPositionUp}
        style={{
          ...handleBase,
          left: `${own.x * 100}%`,
          top: `${own.y * 100}%`,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          cursor: "move",
        }}
      />
      {resizable ? (
        <div
          data-bc-handle="resize"
          onClick={stop}
          onPointerDown={onSizeDown}
          onPointerMove={onSizeMove}
          onPointerUp={onSizeUp}
          style={{
            ...handleBase,
            right: -4,
            bottom: -4,
            borderRadius: "2px",
            cursor: "nwse-resize",
          }}
        />
      ) : undefined}
    </>
  );
}
