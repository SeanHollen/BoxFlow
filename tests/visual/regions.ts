import { z } from "zod";
import type { InspectNode } from "../../src/index";

export interface RegionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  pixels: number;
}

export interface ChangedRegion extends RegionBounds {
  boxes: string[];
}

const CELL = 8;

export function changedRegions(
  before: Uint8Array,
  after: Uint8Array,
  width: number,
  height: number,
): RegionBounds[] {
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const cellPixels = new Int32Array(cols * rows);
  const cellMinX = new Int32Array(cols * rows).fill(width);
  const cellMinY = new Int32Array(cols * rows).fill(height);
  const cellMaxX = new Int32Array(cols * rows).fill(-1);
  const cellMaxY = new Int32Array(cols * rows).fill(-1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (
        before[o] === after[o] &&
        before[o + 1] === after[o + 1] &&
        before[o + 2] === after[o + 2] &&
        before[o + 3] === after[o + 3]
      ) {
        continue;
      }
      const c = Math.floor(y / CELL) * cols + Math.floor(x / CELL);
      cellPixels[c] = (cellPixels[c] ?? 0) + 1;
      cellMinX[c] = Math.min(cellMinX[c] ?? width, x);
      cellMinY[c] = Math.min(cellMinY[c] ?? height, y);
      cellMaxX[c] = Math.max(cellMaxX[c] ?? -1, x);
      cellMaxY[c] = Math.max(cellMaxY[c] ?? -1, y);
    }
  }

  const seen = new Uint8Array(cols * rows);
  const regions: RegionBounds[] = [];
  for (let start = 0; start < cols * rows; start++) {
    if (seen[start] || !cellPixels[start]) continue;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let pixels = 0;
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const c = stack.pop() ?? 0;
      pixels += cellPixels[c] ?? 0;
      minX = Math.min(minX, cellMinX[c] ?? width);
      minY = Math.min(minY, cellMinY[c] ?? height);
      maxX = Math.max(maxX, cellMaxX[c] ?? -1);
      maxY = Math.max(maxY, cellMaxY[c] ?? -1);
      const cx = c % cols;
      const cy = Math.floor(c / cols);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const n = ny * cols + nx;
          if (seen[n] || !cellPixels[n]) continue;
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    regions.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, pixels });
  }
  return regions.sort((a, b) => b.pixels - a.pixels);
}

const vec2Schema = z.object({ x: z.number(), y: z.number() });

const inspectNodeSchema: z.ZodType<InspectNode> = z.lazy(() =>
  z.object({
    kind: z.string(),
    name: z.string().optional(),
    rect: z.object({ left: z.number(), top: z.number(), width: z.number(), height: z.number() }),
    corners: z.object({
      topLeft: vec2Schema,
      topRight: vec2Schema,
      bottomRight: vec2Schema,
      bottomLeft: vec2Schema,
    }),
    children: z.array(inspectNodeSchema),
  }),
);

export const inspectSnapshotSchema = z.object({
  root: z.object({ width: z.number(), height: z.number() }),
  tree: z.array(inspectNodeSchema),
});

export function boxesTouching(region: RegionBounds, tree: readonly InspectNode[]): string[] {
  const names: string[] = [];
  const visit = (nodes: readonly InspectNode[], path: string[]): boolean => {
    let hit = false;
    for (const node of nodes) {
      const { left, top, width, height } = node.rect;
      const overlaps =
        left < region.x + region.width &&
        left + width > region.x &&
        top < region.y + region.height &&
        top + height > region.y;
      if (!overlaps) continue;
      const nextPath = node.name ? [...path, node.name] : path;
      if (visit(node.children, nextPath)) {
        hit = true;
      } else if (node.name) {
        names.push(nextPath.join(" › "));
        hit = true;
      }
    }
    return hit;
  };
  visit(tree, []);
  return [...new Set(names)];
}
