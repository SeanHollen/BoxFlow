import { Box } from "./Box";
import type { BoxBaseProps } from "./Box";
import type { SizeSpec } from "./types";

export type ImageFit = "cover" | "contain" | "fill" | "none" | "scaleDown";

export interface ImageProps extends BoxBaseProps {
  size: SizeSpec;
  src: string;
  alt?: string;
  fit?: ImageFit;
}

export const FIT_CSS: Record<ImageFit, "cover" | "contain" | "fill" | "none" | "scale-down"> = {
  cover: "cover",
  contain: "contain",
  fill: "fill",
  none: "none",
  scaleDown: "scale-down",
};

export function Image({ src, alt, fit = "contain", children, ...boxProps }: ImageProps) {
  return (
    <Box {...boxProps}>
      <img
        src={src}
        alt={alt ?? ""}
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: FIT_CSS[fit], display: "block" }}
      />
      {children}
    </Box>
  );
}
