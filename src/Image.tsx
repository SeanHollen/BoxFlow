import { useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { useContentRect } from "./contentRect.js";
import type { Vec2, Vec2Input } from "./types.js";

export interface ImageProps {
  src: string;
  alt?: string;
  size?: Vec2Input;
}

function resolveImageSize(size: Vec2Input | undefined, natural: Vec2 | undefined): Vec2 {
  const sx = size?.x;
  const sy = size?.y;
  if (sx !== undefined && sy !== undefined) return { x: Math.abs(sx), y: Math.abs(sy) };
  if (!natural || natural.x <= 0 || natural.y <= 0) {
    return { x: Math.abs(sx ?? 0), y: Math.abs(sy ?? 0) };
  }
  if (sx !== undefined) return { x: Math.abs(sx), y: Math.abs(sx) * (natural.y / natural.x) };
  if (sy !== undefined) return { x: Math.abs(sy) * (natural.x / natural.y), y: Math.abs(sy) };
  return natural;
}

export function Image({ src, alt, size }: ImageProps) {
  const [natural, setNatural] = useState<Vec2 | undefined>(undefined);
  const resolved = resolveImageSize(size, natural);
  const elementRef = useRef<HTMLImageElement | null>(null);
  useContentRect(resolved.x, resolved.y, elementRef);

  const readNatural = (el: HTMLImageElement) => {
    if (el.naturalWidth <= 0 || el.naturalHeight <= 0) return;
    setNatural((prev) =>
      prev && prev.x === el.naturalWidth && prev.y === el.naturalHeight
        ? prev
        : { x: el.naturalWidth, y: el.naturalHeight },
    );
  };

  const flips: string[] = [];
  if ((size?.x ?? 0) < 0) flips.push("scaleX(-1)");
  if ((size?.y ?? 0) < 0) flips.push("scaleY(-1)");

  return (
    <img
      src={src}
      alt={alt ?? ""}
      draggable={false}
      data-boxflow-kind="image"
      ref={(el) => {
        elementRef.current = el;
        if (el && el.complete) readNatural(el);
      }}
      onLoad={(event: SyntheticEvent<HTMLImageElement>) => readNatural(event.currentTarget)}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: resolved.x,
        height: resolved.y,
        display: "block",
        transform: flips.length > 0 ? flips.join(" ") : undefined,
      }}
    />
  );
}
