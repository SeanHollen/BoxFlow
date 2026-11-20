import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Box, BoxRoot, PixelGrid, PixelRaster, oklchToRgb, pixelsToRgba } from "../src/index";
import type { PixelColor } from "../src/index";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const putImageData = vi.fn();

class ImageDataStub {
  constructor(
    readonly data: Uint8ClampedArray,
    readonly width: number,
    readonly height: number,
  ) {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("ImageData", ImageDataStub);
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 800,
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 600,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () =>
      ({
        createImageData: (w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData,
      }) as unknown as CanvasRenderingContext2D,
  );
});

beforeEach(() => {
  putImageData.mockClear();
});

const RED: PixelColor = [255, 0, 0];
const GREEN: PixelColor = [0, 255, 0];
const BLUE: PixelColor = [0, 0, 255];
const HALF_WHITE: PixelColor = [255, 255, 255, 0.5];

describe("pixelsToRgba", () => {
  it("packs rgb rows into RGBA bytes, alpha defaulting to opaque", () => {
    const { width, height, data } = pixelsToRgba(
      [
        [RED, GREEN],
        [BLUE, HALF_WHITE],
      ],
      "rgb",
    );
    expect(width).toBe(2);
    expect(height).toBe(2);
    expect([...data]).toEqual([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 128]);
  });

  it("pads ragged rows with transparent cells", () => {
    const { width, height, data } = pixelsToRgba([[RED, GREEN], [BLUE]], "rgb");
    expect(width).toBe(2);
    expect(height).toBe(2);
    expect(Array.from(data.slice(12, 16))).toEqual([0, 0, 0, 0]);
  });

  it("converts oklch cells to sRGB", () => {
    const { data } = pixelsToRgba(
      [
        [
          [1, 0, 0],
          [0, 0, 0],
          [0.627955, 0.257683, 29.234],
        ],
      ],
      "oklch",
    );
    expect(Array.from(data.slice(0, 4))).toEqual([255, 255, 255, 255]);
    expect(Array.from(data.slice(4, 8))).toEqual([0, 0, 0, 255]);
    expect(Array.from(data.slice(8, 12))).toEqual([255, 0, 0, 255]);
  });
});

function exactOklchToRgb(l: number, c: number, h: number): number[] {
  const hue = (h * Math.PI) / 180;
  const a = c * Math.cos(hue);
  const b = c * Math.sin(hue);
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ];
  return linear.map((v) => {
    const encoded = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, encoded)) * 255);
  });
}

describe("oklchToRgb", () => {
  it("matches the exact sRGB transfer function on every channel", () => {
    let seed = 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 20000; i++) {
      const l = random();
      const c = random() * 0.4;
      const h = random() * 360;
      expect(oklchToRgb(l, c, h)).toEqual(exactOklchToRgb(l, c, h));
    }
  });

  it("clamps lightness outside 0–1 to white and black", () => {
    expect(oklchToRgb(1.5, 0, 0)).toEqual([255, 255, 255]);
    expect(oklchToRgb(-0.5, 0, 0)).toEqual([0, 0, 0]);
    expect(oklchToRgb(0.5, 0.1, -400)).toEqual(exactOklchToRgb(0.5, 0.1, -400));
  });

  it("maps reference colors and clamps out-of-gamut channels", () => {
    expect(oklchToRgb(0.519752, 0.176858, 142.495)).toEqual([0, 128, 0]);
    expect(oklchToRgb(0.452014, 0.313214, 264.052)).toEqual([0, 0, 255]);
    const vivid = oklchToRgb(0.7, 0.4, 150);
    for (const channel of vivid) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });
});

describe("PixelRaster", () => {
  it("reports the full rectangle on the first update and nothing for the same array", () => {
    const raster = new PixelRaster();
    const pixels = [
      [RED, GREEN],
      [BLUE, RED],
    ];
    expect(raster.update(pixels, "rgb")).toEqual({ x: 0, y: 0, width: 2, height: 2 });
    expect(raster.update(pixels, "rgb")).toBeUndefined();
  });

  it("converts only the changed cell when rows are shared", () => {
    const raster = new PixelRaster();
    const pixels = [
      [RED, RED, RED],
      [RED, RED, RED],
      [RED, RED, RED],
    ];
    raster.update(pixels, "rgb");
    const next = pixels.slice();
    next[1] = [RED, RED, BLUE];
    expect(raster.update(next, "rgb")).toEqual({ x: 2, y: 1, width: 1, height: 1 });
    expect(Array.from(raster.data.slice(20, 24))).toEqual([0, 0, 255, 255]);
  });

  it("bounds scattered changes and ignores value-equal fresh tuples", () => {
    const raster = new PixelRaster();
    raster.update(
      [
        [RED, RED, RED],
        [RED, RED, RED],
      ],
      "rgb",
    );
    expect(
      raster.update(
        [
          [[255, 0, 0], GREEN, RED],
          [RED, RED, [0, 0, 255]],
        ],
        "rgb",
      ),
    ).toEqual({ x: 1, y: 0, width: 2, height: 2 });
    expect(
      raster.update(
        [
          [[255, 0, 0], GREEN, RED],
          [RED, RED, [0, 0, 255]],
        ],
        "rgb",
      ),
    ).toBeUndefined();
  });

  it("clears cells a shortened row no longer covers", () => {
    const raster = new PixelRaster();
    raster.update(
      [
        [RED, RED],
        [RED, RED],
      ],
      "rgb",
    );
    expect(raster.update([[RED, RED], [RED]], "rgb")).toEqual({ x: 1, y: 1, width: 1, height: 1 });
    expect(Array.from(raster.data.slice(12, 16))).toEqual([0, 0, 0, 0]);
  });

  it("repaints everything when the dimensions or color space change", () => {
    const raster = new PixelRaster();
    const pixels = [[RED]];
    raster.update(pixels, "rgb");
    expect(raster.update(pixels, "oklch")).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    expect(raster.update([[RED, RED]], "oklch")).toEqual({ x: 0, y: 0, width: 2, height: 1 });
  });
});

describe("PixelGrid", () => {
  it("sizes itself to columns × rows × pixelSize so a hugging parent counts it", () => {
    render(
      <BoxRoot>
        <Box>
          <PixelGrid
            pixelSize={10}
            pixels={[
              [RED, GREEN, BLUE],
              [BLUE, GREEN, RED],
            ]}
          />
          <span data-testid="marker" />
        </Box>
      </BoxRoot>,
    );
    const parent = screen.getByTestId("marker").parentElement;
    expect(parent?.style.width).toBe("30px");
    expect(parent?.style.height).toBe("20px");
  });

  it("backs the grid with one source-resolution canvas scaled without smoothing", () => {
    render(
      <BoxRoot>
        <Box name="grid">
          <PixelGrid pixelSize={4} pixels={[[RED, GREEN, BLUE]]} />
        </Box>
      </BoxRoot>,
    );
    const canvas = document.querySelector('[data-boxflow-name="grid"] canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(3);
    expect(canvas.height).toBe(1);
    expect(canvas.style.imageRendering).toBe("pixelated");
    expect(canvas.style.width).toBe("12px");
    expect(canvas.style.height).toBe("4px");
    expect(canvas.style.left).toBe("0px");
    expect(putImageData).toHaveBeenCalledTimes(1);
  });

  it("repaints only when the pixels array changes identity", () => {
    const pixels = [[RED]];
    const view = render(
      <BoxRoot>
        <PixelGrid pixels={pixels} />
      </BoxRoot>,
    );
    view.rerender(
      <BoxRoot>
        <PixelGrid pixels={pixels} />
      </BoxRoot>,
    );
    expect(putImageData).toHaveBeenCalledTimes(1);
    view.rerender(
      <BoxRoot>
        <PixelGrid pixels={[[GREEN]]} />
      </BoxRoot>,
    );
    expect(putImageData).toHaveBeenCalledTimes(2);
  });

  it("uploads only the dirty rectangle after a one-cell change", () => {
    const pixels = [
      [RED, RED, RED],
      [RED, RED, RED],
    ];
    const view = render(
      <BoxRoot>
        <PixelGrid pixels={pixels} />
      </BoxRoot>,
    );
    const next = pixels.slice();
    next[1] = [RED, GREEN, RED];
    view.rerender(
      <BoxRoot>
        <PixelGrid pixels={next} />
      </BoxRoot>,
    );
    expect(putImageData).toHaveBeenLastCalledWith(expect.anything(), 0, 0, 1, 1, 1, 1);
  });
});
