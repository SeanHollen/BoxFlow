import { describe, expect, it } from "vitest";
import {
  attachFor,
  childTotalsFromRects,
  computeTopLeft,
  overflowToCss,
  resolveSize,
} from "../src/layout";

const parentRect = { left: 0, top: 0, right: 800, bottom: 600 };

describe("computeTopLeft", () => {
  it("places a topLeft-attached box at its position", () => {
    const result = computeTopLeft({
      from: "topLeft",
      to: "topLeft",
      position: { x: 400, y: 0 },
      size: { x: 400, y: 5 },
      reference: parentRect,
    });
    expect(result).toEqual({ x: 400, y: 0 });
  });

  it("offsets by the box's own attach point", () => {
    const result = computeTopLeft({
      from: "topLeft",
      to: "center",
      position: { x: 400, y: 300 },
      size: { x: 100, y: 50 },
      reference: parentRect,
    });
    expect(result).toEqual({ x: 350, y: 275 });
  });

  it("anchors position to the reference's from point", () => {
    const result = computeTopLeft({
      from: "center",
      to: "topLeft",
      position: { x: 0, y: 0 },
      size: { x: 100, y: 50 },
      reference: parentRect,
    });
    expect(result).toEqual({ x: 400, y: 300 });
  });

  it("centers a box on the reference center", () => {
    const result = computeTopLeft({
      from: "center",
      to: "center",
      position: { x: 0, y: 0 },
      size: { x: 100, y: 50 },
      reference: parentRect,
    });
    expect(result).toEqual({ x: 350, y: 275 });
  });

  it("pins a box to the reference's bottomRight corner", () => {
    const result = computeTopLeft({
      from: "bottomRight",
      to: "bottomRight",
      position: { x: 0, y: 0 },
      size: { x: 100, y: 50 },
      reference: parentRect,
    });
    expect(result).toEqual({ x: 700, y: 550 });
  });

  it("attaches below a sibling rect", () => {
    const result = computeTopLeft({
      from: "bottomLeft",
      to: "topLeft",
      position: { x: 0, y: 4 },
      size: { x: 100, y: 20 },
      reference: { left: 10, top: 20, right: 110, bottom: 60 },
    });
    expect(result).toEqual({ x: 10, y: 64 });
  });
});

describe("attachFor", () => {
  it("defaults to topLeft-to-topLeft", () => {
    expect(attachFor(undefined, undefined)).toEqual({ from: "topLeft", to: "topLeft" });
  });

  it("expands stack modes to their pivot pairs", () => {
    expect(attachFor(undefined, "vertical")).toEqual({ from: "bottomLeft", to: "topLeft" });
    expect(attachFor(undefined, "horizontal")).toEqual({ from: "topRight", to: "topLeft" });
    expect(attachFor(undefined, "verticalReverse")).toEqual({ from: "topLeft", to: "bottomLeft" });
    expect(attachFor(undefined, "horizontalReverse")).toEqual({ from: "topLeft", to: "topRight" });
  });

  it("rejects pivot combined with stackMode", () => {
    expect(() => attachFor({ from: "center", to: "center" }, "vertical")).toThrowError(/stackMode/);
  });
});

describe("resolveSize", () => {
  const totals = { x: 70, y: 50 };

  it("passes plain numbers through", () => {
    expect(resolveSize({ x: 10, y: 20 }, totals)).toEqual({ x: 10, y: 20 });
  });

  it("resolves the childTotals shorthand on both axes", () => {
    expect(resolveSize("childTotals", totals)).toEqual({ x: 70, y: 50 });
  });

  it("resolves childTotals per axis", () => {
    expect(resolveSize({ x: 10, y: "childTotals" }, totals)).toEqual({ x: 10, y: 50 });
  });

  it("calls a size function with the child totals", () => {
    expect(resolveSize((xt, yt) => ({ x: xt + 1, y: yt + 2 }), totals)).toEqual({
      x: 71,
      y: 52,
    });
  });
});

describe("childTotalsFromRects", () => {
  it("returns zero with no children", () => {
    expect(childTotalsFromRects(new Map())).toEqual({ x: 0, y: 0 });
  });

  it("spans from the outermost child edges", () => {
    const rects = new Map([
      ["a", { left: 10, top: 10, right: 60, bottom: 30 }],
      ["b", { left: 30, top: 40, right: 80, bottom: 60 }],
    ]);
    expect(childTotalsFromRects(rects)).toEqual({ x: 70, y: 50 });
  });
});

describe("overflowToCss", () => {
  it("defaults both axes to visible", () => {
    expect(overflowToCss(undefined)).toEqual({
      overflowX: "visible",
      overflowY: "visible",
    });
  });

  it("maps clip and scrollbar per axis", () => {
    expect(overflowToCss({ x: "clip", y: "scrollbar" })).toMatchObject({
      overflowX: "hidden",
      overflowY: "scroll",
    });
  });

  it("contains scroll chaining on scrollbar axes only", () => {
    const css = overflowToCss({ x: "clip", y: "scrollbar" });
    expect(css.overscrollBehaviorY).toBe("contain");
    expect(css.overscrollBehaviorX).toBeUndefined();
  });
});
