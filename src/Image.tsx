import { useState } from "react";
import type { SyntheticEvent } from "react";
import { Box } from "./Box";
import type { BoxBaseProps } from "./Box";
import type { SizeSpec, Vec2 } from "./types";

export interface ImageProps extends BoxBaseProps {
  size?: SizeSpec;
  src: string;
  alt?: string;
}

function proportionalSize(
  size: SizeSpec | undefined,
  natural: Vec2 | undefined,
): SizeSpec | undefined {
  if (typeof size === "function") return size;
  const sx = size?.x;
  const sy = size?.y;
  if (sx !== undefined && sy !== undefined) return size;
  if (!natural || natural.x <= 0 || natural.y <= 0) {
    return { ...size, x: sx ?? 0, y: sy ?? 0 };
  }
  if (sx !== undefined) {
    return { ...size, x: sx, y: Math.abs(sx) * (natural.y / natural.x) };
  }
  if (sy !== undefined) {
    return { ...size, x: Math.abs(sy) * (natural.x / natural.y), y: sy };
  }
  return { ...size, x: natural.x, y: natural.y };
}

export function Image({ src, alt, size, children, ...boxProps }: ImageProps) {
  const [natural, setNatural] = useState<Vec2 | undefined>(undefined);

  const readNatural = (el: HTMLImageElement) => {
    if (el.naturalWidth <= 0 || el.naturalHeight <= 0) return;
    setNatural((prev) =>
      prev && prev.x === el.naturalWidth && prev.y === el.naturalHeight
        ? prev
        : { x: el.naturalWidth, y: el.naturalHeight },
    );
  };

  return (
    <Box {...boxProps} size={proportionalSize(size, natural)}>
      <img
        src={src}
        alt={alt ?? ""}
        draggable={false}
        ref={(el) => {
          if (el && el.complete) readNatural(el);
        }}
        onLoad={(event: SyntheticEvent<HTMLImageElement>) => readNatural(event.currentTarget)}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      {children}
    </Box>
  );
}
