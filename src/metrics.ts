import type { TextFont } from "./types";

let metricsContext: CanvasRenderingContext2D | null | undefined;

function getMetricsContext(): CanvasRenderingContext2D | null {
  if (metricsContext !== undefined) return metricsContext;
  try {
    metricsContext = document.createElement("canvas").getContext("2d");
  } catch {
    metricsContext = null;
  }
  return metricsContext;
}

export function fontBaselineOffset(font: TextFont | undefined): number {
  const size = font?.size ?? 16;
  let ascent = size * 0.8;
  let descent = size * 0.25;
  const context = getMetricsContext();
  if (context) {
    const family = font?.family ?? "system-ui, sans-serif";
    const weight = font?.weight ?? "normal";
    try {
      context.font = `${weight} ${size}px ${family}`;
      const measured = context.measureText("Mg");
      if (measured.fontBoundingBoxAscent > 0) {
        ascent = measured.fontBoundingBoxAscent;
        descent = measured.fontBoundingBoxDescent;
      }
    } catch {
      // canvas without text metrics: keep the size-based approximation
    }
  }
  const lineHeight = font?.lineHeight;
  if (lineHeight === undefined) return ascent;
  return (lineHeight * size - (ascent + descent)) / 2 + ascent;
}
