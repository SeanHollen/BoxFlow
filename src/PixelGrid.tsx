import { useCallback, useRef, useState } from "react";
import { Box } from "./Box.js";
import type { BoxBaseProps } from "./Box.js";

export type PixelColor =
  | readonly [number, number, number]
  | readonly [number, number, number, number];

export type PixelColorSpace = "rgb" | "oklch";

export type PixelRows = readonly (readonly PixelColor[])[];

export interface PixelGridProps extends BoxBaseProps {
  pixels: PixelRows;
  pixelSize?: number;
  colorSpace?: PixelColorSpace;
}

export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray<ArrayBuffer>;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ByteSink {
  [index: number]: number;
}

function exactSrgb8(linear: number): number {
  const encoded = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, encoded)) * 255);
}

const GAMMA_BUCKETS = 4096;
const GAMMA_TOP = 1 - 1 / (GAMMA_BUCKETS * 2);
const SINE_STEPS = 1 << 14;
const SINE_MASK = SINE_STEPS - 1;
const QUARTER_TURN = SINE_STEPS / 4;
const STEPS_PER_DEGREE = SINE_STEPS / 360;

interface OklchTables {
  gammaThresholds: Float64Array;
  gammaBase: Uint8Array;
  sine: Float64Array;
}

let oklchTables: OklchTables | undefined;

function buildOklchTables(): OklchTables {
  const gammaThresholds = new Float64Array(257);
  gammaThresholds[256] = NaN;
  for (let k = 1; k <= 255; k++) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 64; i++) {
      const mid = (lo + hi) / 2;
      if (exactSrgb8(mid) >= k) hi = mid;
      else lo = mid;
    }
    gammaThresholds[k] = hi;
  }
  const gammaBase = new Uint8Array(GAMMA_BUCKETS);
  for (let i = 0; i < GAMMA_BUCKETS; i++) gammaBase[i] = exactSrgb8(i / GAMMA_BUCKETS);
  const sine = new Float64Array(SINE_STEPS + QUARTER_TURN + 1);
  for (let i = 0; i < sine.length; i++) sine[i] = Math.sin((i / SINE_STEPS) * 2 * Math.PI);
  return { gammaThresholds, gammaBase, sine };
}

function getOklchTables(): OklchTables {
  oklchTables ??= buildOklchTables();
  return oklchTables;
}

// Fully inlined so no double crosses a call boundary: V8 boxes doubles passed to
// non-inlined calls, which dominated the per-cell cost in Chrome.
function writeOklch(tables: OklchTables, out: ByteSink, offset: number, cell: PixelColor) {
  const { sine, gammaBase, gammaThresholds } = tables;
  const l = cell[0];
  const c = cell[1];
  const steps = cell[2] * STEPS_PER_DEGREE;
  const whole = Math.floor(steps);
  const t = steps - whole;
  const k = whole & SINE_MASK;
  const s0 = sine[k] ?? 0;
  const c0 = sine[k + QUARTER_TURN] ?? 0;
  const a = c * (c0 + ((sine[k + QUARTER_TURN + 1] ?? 0) - c0) * t);
  const b = c * (s0 + ((sine[k + 1] ?? 0) - s0) * t);
  const l1 = l + 0.3963377774 * a + 0.2158037573 * b;
  const m1 = l - 0.1055613458 * a - 0.0638541728 * b;
  const s1 = l - 0.0894841775 * a - 1.291485548 * b;
  const lc = l1 * l1 * l1;
  const mc = m1 * m1 * m1;
  const sc = s1 * s1 * s1;
  const r = 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  const g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  const bl = -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc;
  const kr = gammaBase[(Math.min(Math.max(r, 0), GAMMA_TOP) * GAMMA_BUCKETS) | 0] ?? 0;
  const kg = gammaBase[(Math.min(Math.max(g, 0), GAMMA_TOP) * GAMMA_BUCKETS) | 0] ?? 0;
  const kb = gammaBase[(Math.min(Math.max(bl, 0), GAMMA_TOP) * GAMMA_BUCKETS) | 0] ?? 0;
  out[offset] = kr + +(r >= (gammaThresholds[kr + 1] ?? NaN));
  out[offset + 1] = kg + +(g >= (gammaThresholds[kg + 1] ?? NaN));
  out[offset + 2] = kb + +(bl >= (gammaThresholds[kb + 1] ?? NaN));
}

export function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  writeOklch(getOklchTables(), out, 0, [l, c, h]);
  return out;
}

function writeRgbCell(data: Uint8ClampedArray, offset: number, cell: PixelColor | undefined) {
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const a = data[offset + 3];
  if (cell === undefined) {
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;
  } else {
    data[offset] = cell[0];
    data[offset + 1] = cell[1];
    data[offset + 2] = cell[2];
    data[offset + 3] = Math.round(alphaOf(cell) * 255);
  }
  return (
    data[offset] !== r || data[offset + 1] !== g || data[offset + 2] !== b || data[offset + 3] !== a
  );
}

function alphaOf(cell: PixelColor): number {
  return cell.length === 4 ? cell[3] : 1;
}

function writeOklchCell(
  tables: OklchTables,
  data: Uint8ClampedArray,
  offset: number,
  cell: PixelColor | undefined,
  prev: PixelColor | undefined,
) {
  if (cell === undefined) {
    if (prev === undefined) return false;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;
    return true;
  }
  if (
    prev !== undefined &&
    cell[0] === prev[0] &&
    cell[1] === prev[1] &&
    cell[2] === prev[2] &&
    alphaOf(cell) === alphaOf(prev)
  ) {
    return false;
  }
  writeOklch(tables, data, offset, cell);
  data[offset + 3] = Math.round(alphaOf(cell) * 255);
  return true;
}

function gridWidth(pixels: PixelRows): number {
  let width = 0;
  for (const row of pixels) if (row.length > width) width = row.length;
  return width;
}

const NO_ROW: readonly PixelColor[] = [];

export class PixelRaster {
  width = 0;
  height = 0;
  data = new Uint8ClampedArray(0);
  private previous: PixelRows | undefined;
  private colorSpace: PixelColorSpace = "rgb";

  update(pixels: PixelRows, colorSpace: PixelColorSpace): PixelRect | undefined {
    const previous = this.previous;
    if (pixels === previous && colorSpace === this.colorSpace) return undefined;
    const width = gridWidth(pixels);
    const height = pixels.length;
    this.previous = pixels;
    if (
      previous === undefined ||
      width !== this.width ||
      height !== this.height ||
      colorSpace !== this.colorSpace
    ) {
      return this.repaintAll(pixels, colorSpace, width, height);
    }
    const data = this.data;
    const tables = colorSpace === "oklch" ? getOklchTables() : undefined;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      const row = pixels[y] ?? NO_ROW;
      const prevRow = previous[y] ?? NO_ROW;
      if (row === prevRow) continue;
      for (let x = 0; x < width; x++) {
        const cell = row[x];
        const prev = prevRow[x];
        if (cell === prev) continue;
        const offset = (y * width + x) * 4;
        const changed = tables
          ? writeOklchCell(tables, data, offset, cell, prev)
          : writeRgbCell(data, offset, cell);
        if (!changed) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        maxY = y;
      }
    }
    if (maxX < 0) return undefined;
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }

  private repaintAll(
    pixels: PixelRows,
    colorSpace: PixelColorSpace,
    width: number,
    height: number,
  ): PixelRect | undefined {
    const length = width * height * 4;
    if (this.data.length !== length) this.data = new Uint8ClampedArray(length);
    this.width = width;
    this.height = height;
    this.colorSpace = colorSpace;
    const data = this.data;
    const tables = colorSpace === "oklch" ? getOklchTables() : undefined;
    for (let y = 0; y < height; y++) {
      const row = pixels[y] ?? NO_ROW;
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const cell = row[x];
        if (cell !== undefined && tables) {
          writeOklch(tables, data, offset, cell);
          data[offset + 3] = Math.round(alphaOf(cell) * 255);
        } else {
          writeRgbCell(data, offset, cell);
        }
      }
    }
    if (width === 0 || height === 0) return undefined;
    return { x: 0, y: 0, width, height };
  }
}

export function pixelsToRgba(pixels: PixelRows, colorSpace: PixelColorSpace): RgbaImage {
  const raster = new PixelRaster();
  raster.update(pixels, colorSpace);
  return { width: raster.width, height: raster.height, data: raster.data };
}

export function PixelGrid({
  pixels,
  pixelSize = 1,
  colorSpace = "rgb",
  children,
  ...boxProps
}: PixelGridProps) {
  const [raster] = useState(() => new PixelRaster());
  const imageRef = useRef<ImageData | undefined>(undefined);
  const width = gridWidth(pixels);
  const height = pixels.length;

  const paint = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const dirty = raster.update(pixels, colorSpace);
      if (!dirty) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      let image = imageRef.current;
      if (image?.data !== raster.data) {
        image = new ImageData(raster.data, raster.width, raster.height);
        imageRef.current = image;
      }
      ctx.putImageData(image, 0, 0, dirty.x, dirty.y, dirty.width, dirty.height);
    },
    [raster, pixels, colorSpace],
  );

  return (
    <Box {...boxProps} size={{ x: width * pixelSize, y: height * pixelSize }}>
      <canvas
        ref={paint}
        width={width}
        height={height}
        style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }}
      />
      {children}
    </Box>
  );
}
