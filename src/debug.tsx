import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { z } from "zod";
import type {
  BoxBorder,
  BoxOverflow,
  ChildRect,
  PivotPair,
  RelativeTo,
  SizeSpec,
  SizeValues,
  StackMode,
  Vec2,
} from "./types";

const pivotSchema = z.enum([
  "topLeft",
  "topCenter",
  "topRight",
  "centerLeft",
  "center",
  "centerRight",
  "bottomLeft",
  "bottomCenter",
  "bottomRight",
]);

const axisSizeSchema = z.union([z.number(), z.literal("childTotals")]);
const overflowModeSchema = z.enum(["visible", "clip", "scrollbar", "ellipsis"]);

export const overrideSchema = z.strictObject({
  position: z.strictObject({ x: z.number(), y: z.number() }).optional(),
  size: z
    .union([
      z.literal("childTotals"),
      z.literal("(function)"),
      z.strictObject({ x: axisSizeSchema, y: axisSizeSchema }),
    ])
    .optional(),
  pivot: z.strictObject({ from: pivotSchema.optional(), to: pivotSchema.optional() }).optional(),
  relativeTo: z.enum(["parent", "siblings"]).optional(),
  stackMode: z.enum(["vertical", "horizontal", "verticalReverse", "horizontalReverse"]).optional(),
  overflow: z
    .strictObject({ x: overflowModeSchema.optional(), y: overflowModeSchema.optional() })
    .optional(),
  border: z
    .strictObject({
      width: z.number(),
      color: z.string().optional(),
      style: z.enum(["solid", "dashed", "dotted", "double"]).optional(),
    })
    .optional(),
});

export type DebugOverride = z.infer<typeof overrideSchema>;

export type DebugKind = "box" | "text";

export interface DebugSelection {
  id: string;
  kind: DebugKind;
  name?: string;
  snapshot: string;
}

export interface DebugContextValue {
  open: boolean;
  outlineBoxes: boolean;
  outlineTexts: boolean;
  deadSpace: boolean;
  overrides: Record<string, DebugOverride>;
  selectedId: string | undefined;
  select: (selection: DebugSelection) => void;
}

export const DebugContext = createContext<DebugContextValue | undefined>(undefined);

function selectionLabel(selection: DebugSelection): string {
  if (!selection.name) return `selected: ${selection.kind}`;
  const name = selection.name.length > 40 ? `${selection.name.slice(0, 40)}…` : selection.name;
  return `selected: ${selection.kind} “${name}”`;
}

export function snapshotProps(input: {
  position: Vec2;
  size?: SizeSpec | { x?: number; y?: number };
  pivot?: PivotPair;
  relativeTo?: RelativeTo;
  stackMode?: StackMode;
  overflow?: BoxOverflow;
  border?: BoxBorder;
}): string {
  const size = typeof input.size === "function" ? "(function)" : input.size;
  return JSON.stringify(
    {
      position: input.position,
      size,
      pivot: input.pivot,
      relativeTo: input.relativeTo,
      stackMode: input.stackMode,
      overflow: input.overflow,
      border: input.border,
    },
    undefined,
    2,
  );
}

const DEAD_SPACE_STYLE: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(217, 48, 37, 0.12) 0px, rgba(217, 48, 37, 0.12) 6px, transparent 6px, transparent 12px)",
};

export function deadSpaceStyle(
  debug: DebugContextValue | undefined,
  kind: DebugKind,
  values: SizeValues,
  resolved: Vec2,
  childRects: ReadonlyMap<string, ChildRect>,
): CSSProperties {
  if (!debug?.deadSpace || kind !== "box" || childRects.size === 0) return {};
  let minLeft = Infinity;
  let minTop = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;
  for (const rect of childRects.values()) {
    minLeft = Math.min(minLeft, rect.left);
    minTop = Math.min(minTop, rect.top);
    maxRight = Math.max(maxRight, rect.right);
    maxBottom = Math.max(maxBottom, rect.bottom);
  }
  const slackX = typeof values.x === "number" ? resolved.x - (maxRight - minLeft) : 0;
  const slackY = typeof values.y === "number" ? resolved.y - (maxBottom - minTop) : 0;
  if (slackX <= 16 && slackY <= 16) return {};
  return DEAD_SPACE_STYLE;
}

export function debugOutline(
  debug: DebugContextValue | undefined,
  id: string,
  kind: DebugKind,
): CSSProperties {
  if (!debug) return {};
  if (debug.selectedId === id) return { outline: "2px solid #ea4335", outlineOffset: -2 };
  const outlined = kind === "box" ? debug.outlineBoxes : debug.outlineTexts;
  if (!outlined) return {};
  const color = kind === "box" ? "#4285f4" : "#d01884";
  return { outline: `1px solid ${color}`, outlineOffset: -1 };
}

const panelStyle: CSSProperties = {
  position: "absolute",
  width: 300,
  zIndex: 9999,
  backgroundColor: "#fff",
  border: "1px solid #dadce0",
  borderRadius: "8px",
  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.15)",
  padding: "12px",
  boxSizing: "border-box",
  fontFamily: "system-ui, sans-serif",
  fontSize: "12px",
  color: "#202124",
};

export function DebugProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [outlineBoxes, setOutlineBoxes] = useState(false);
  const [outlineTexts, setOutlineTexts] = useState(false);
  const [deadSpace, setDeadSpace] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, DebugOverride>>({});
  const [selection, setSelection] = useState<DebugSelection | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [panelPos, setPanelPos] = useState<Vec2 | undefined>(undefined);
  const dragRef = useRef<{ dx: number; dy: number } | undefined>(undefined);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const combo =
        (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "d";
      if (!combo) return;
      event.preventDefault();
      setOpen((prev) => !prev);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const select = useCallback((next: DebugSelection) => {
    setSelection(next);
    setDraft(next.snapshot);
    setError(undefined);
  }, []);

  const value = useMemo<DebugContextValue>(
    () => ({
      open,
      outlineBoxes,
      outlineTexts,
      deadSpace,
      overrides,
      selectedId: selection?.id,
      select,
    }),
    [open, outlineBoxes, outlineTexts, deadSpace, overrides, selection?.id, select],
  );

  const apply = () => {
    if (!selection) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch {
      setError("invalid JSON");
      return;
    }
    const result = overrideSchema.safeParse(parsed);
    if (!result.success) {
      setError(
        result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      );
      return;
    }
    setError(undefined);
    setOverrides((prev) => ({ ...prev, [selection.id]: result.data }));
  };

  const onHeaderPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const panel = event.currentTarget.parentElement;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onHeaderPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const panel = event.currentTarget.parentElement;
    const container = panel?.offsetParent;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    setPanelPos({
      x: event.clientX - containerRect.left - drag.dx,
      y: event.clientY - containerRect.top - drag.dy,
    });
  };

  const onHeaderPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = undefined;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const clearOverride = () => {
    if (!selection) return;
    setError(undefined);
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[selection.id];
      return next;
    });
  };

  return (
    <DebugContext.Provider value={value}>
      {children}
      {open ? (
        <div
          style={{
            ...panelStyle,
            ...(panelPos ? { left: panelPos.x, top: panelPos.y } : { top: 12, right: 12 }),
          }}
        >
          <div
            onPointerDown={onHeaderPointerDown}
            onPointerMove={onHeaderPointerMove}
            onPointerUp={onHeaderPointerUp}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
              cursor: "grab",
              userSelect: "none",
              touchAction: "none",
            }}
          >
            <span style={{ fontWeight: 600 }}>{`boxcomponents debug`}</span>
            <button
              type="button"
              aria-label="close debug panel"
              onClick={() => setOpen(false)}
              onPointerDown={(event) => event.stopPropagation()}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "14px",
                color: "#5f6368",
                padding: 0,
                lineHeight: 1,
              }}
            >
              {`✕`}
            </button>
          </div>
          <label style={{ display: "block", marginBottom: "4px" }}>
            <input
              type="checkbox"
              aria-label="outline boxes"
              checked={outlineBoxes}
              onChange={(event) => setOutlineBoxes(event.target.checked)}
            />
            {` outline boxes`}
            <span style={{ color: "#4285f4" }}>{` ■`}</span>
          </label>
          <label style={{ display: "block", marginBottom: "4px" }}>
            <input
              type="checkbox"
              aria-label="outline texts"
              checked={outlineTexts}
              onChange={(event) => setOutlineTexts(event.target.checked)}
            />
            {` outline texts`}
            <span style={{ color: "#d01884" }}>{` ■`}</span>
          </label>
          <label style={{ display: "block", marginBottom: "8px" }}>
            <input
              type="checkbox"
              aria-label="highlight dead space"
              checked={deadSpace}
              onChange={(event) => setDeadSpace(event.target.checked)}
            />
            {` highlight dead space`}
            <span style={{ color: "#d93025" }}>{` ▨`}</span>
          </label>
          <div style={{ marginBottom: "4px", color: "#5f6368" }}>
            {selection ? selectionLabel(selection) : `click an element to inspect it`}
          </div>
          {selection ? (
            <div
              style={{
                marginBottom: "8px",
                color: "#80868b",
                fontFamily: "ui-monospace, monospace",
                fontSize: "11px",
              }}
            >
              {`id ${selection.id}`}
            </div>
          ) : undefined}
          {selection ? (
            <>
              <textarea
                aria-label="props json"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={12}
                spellCheck={false}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "11px",
                }}
              />
              {error ? (
                <div style={{ color: "#d93025", marginTop: "4px" }}>{error}</div>
              ) : undefined}
              <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                <button type="button" onClick={apply}>{`Apply`}</button>
                <button type="button" onClick={clearOverride}>{`Clear override`}</button>
              </div>
            </>
          ) : undefined}
        </div>
      ) : undefined}
    </DebugContext.Provider>
  );
}
