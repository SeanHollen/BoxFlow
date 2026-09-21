import { useEffect, useRef, useState } from "react";
import { Box, Image, Text, resolvedAxis, useParentBoxProps } from "../src/index";
import type { Vec2 } from "../src/index";

const SPRITE = 48;
const LABEL_H = 14;

interface SpriteState {
  id: string;
  img: string;
  pos: Vec2;
  vel: Vec2;
}

type Shape = "circle" | "square" | "triangle" | "diamond";

function shapeUri(shape: Shape, color: string): string {
  const shapes: Record<Shape, string> = {
    circle: `<circle cx="24" cy="24" r="20" fill="${color}"/>`,
    square: `<rect x="6" y="6" width="36" height="36" rx="6" fill="${color}"/>`,
    triangle: `<polygon points="24,4 44,42 4,42" fill="${color}"/>`,
    diamond: `<polygon points="24,2 46,24 24,46 2,24" fill="${color}"/>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">${shapes[shape]}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const INITIAL: SpriteState[] = [
  {
    id: "circle",
    img: shapeUri("circle", "#1a73e8"),
    pos: { x: 20, y: 20 },
    vel: { x: 70, y: 45 },
  },
  {
    id: "square",
    img: shapeUri("square", "#188038"),
    pos: { x: 200, y: 60 },
    vel: { x: -55, y: 60 },
  },
  {
    id: "triangle",
    img: shapeUri("triangle", "#d93025"),
    pos: { x: 90, y: 150 },
    vel: { x: 60, y: -50 },
  },
  {
    id: "diamond",
    img: shapeUri("diamond", "#f9ab00"),
    pos: { x: 240, y: 130 },
    vel: { x: -65, y: -40 },
  },
];

function step(s: SpriteState, bounds: Vec2, dt: number): SpriteState {
  let x = s.pos.x + s.vel.x * dt;
  let y = s.pos.y + s.vel.y * dt;
  let vx = s.vel.x;
  let vy = s.vel.y;
  const maxX = bounds.x - SPRITE;
  const maxY = bounds.y - SPRITE - LABEL_H;
  if (x < 0) {
    x = 0;
    vx = -vx;
  }
  if (x > maxX) {
    x = maxX;
    vx = -vx;
  }
  if (y < 0) {
    y = 0;
    vy = -vy;
  }
  if (y > maxY) {
    y = maxY;
    vy = -vy;
  }
  return { ...s, pos: { x, y }, vel: { x: vx, y: vy } };
}

function useBouncingSprites(bounds: Vec2): SpriteState[] {
  const [sprites, setSprites] = useState(INITIAL);
  const boundsRef = useRef(bounds);

  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      setSprites((prev) => prev.map((s) => step(s, boundsRef.current, dt)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return sprites;
}

function centerOf(s: SpriteState): Vec2 {
  return { x: s.pos.x + SPRITE / 2, y: s.pos.y + SPRITE / 2 };
}

function distanceBetween(a: SpriteState, b: SpriteState): number {
  const ca = centerOf(a);
  const cb = centerOf(b);
  return Math.hypot(ca.x - cb.x, ca.y - cb.y);
}

interface Nearest {
  id: string;
  d: number;
}

function nearestNeighbors(sprites: SpriteState[]): Map<string, Nearest> {
  const result = new Map<string, Nearest>();
  for (const s of sprites) {
    for (const other of sprites) {
      if (other.id === s.id) continue;
      const d = distanceBetween(s, other);
      const best = result.get(s.id);
      if (!best || d < best.d) result.set(s.id, { id: other.id, d });
    }
  }
  return result;
}

function closestPair(sprites: SpriteState[], nearest: Map<string, Nearest>): [string, string] {
  let best: [string, string] = ["", ""];
  let bestD = Infinity;
  for (const s of sprites) {
    const n = nearest.get(s.id);
    if (n && n.d < bestD) {
      bestD = n.d;
      best = [s.id, n.id];
    }
  }
  return best;
}

function Sprite({
  sprite,
  label,
  highlighted,
}: {
  sprite: SpriteState;
  label: string;
  highlighted: boolean;
}) {
  return (
    <>
      <Image
        name={sprite.id}
        position={sprite.pos}
        size={{ x: SPRITE, y: SPRITE }}
        zValue={sprite.pos.y}
        src={sprite.img}
        alt={sprite.id}
        fit="contain"
        style={highlighted ? { outline: "2px solid #1a73e8", borderRadius: "10px" } : undefined}
      />
      <Text
        pivot={{ to: "topCenter" }}
        position={{ x: sprite.pos.x + SPRITE / 2, y: sprite.pos.y + SPRITE }}
        font={{ size: 10, color: "#5f6368" }}
      >
        {label}
      </Text>
    </>
  );
}

function PlayfieldLayout() {
  const parentProps = useParentBoxProps({ countBorder: true });
  const size = { x: resolvedAxis(parentProps.size.x), y: resolvedAxis(parentProps.size.y) };
  const arena = { x: size.x - 16, y: size.y - 86 };
  const sprites = useBouncingSprites(arena);
  const nearest = nearestNeighbors(sprites);
  const [pairA, pairB] = closestPair(sprites, nearest);
  const pairD = nearest.get(pairA)?.d ?? 0;

  return (
    <>
      <Text
        position={{ x: 12, y: 10 }}
        size={{ x: size.x - 24, y: 18 }}
        font={{ size: 13, weight: 600, color: "#202124" }}
      >
        {`Bouncing sprites — positions as data`}
      </Text>
      <Text
        position={{ x: 12, y: 28 }}
        size={{ x: size.x - 24 }}
        font={{ size: 11, color: "#80868b" }}
      >
        {`<Image> sprites; zValue stacks lower ones on top; distances from Vec2 state`}
      </Text>
      <Box
        name="arena"
        position={{ x: 8, y: 52 }}
        size={arena}
        overflow={{ x: "clip", y: "clip" }}
        style={{ backgroundColor: "#f8f9fa", borderRadius: "6px" }}
      >
        {sprites.map((s) => {
          const n = nearest.get(s.id);
          return (
            <Sprite
              key={s.id}
              sprite={s}
              label={n ? `→ ${n.id} ${Math.round(n.d)}px` : ""}
              highlighted={s.id === pairA || s.id === pairB}
            />
          );
        })}
      </Box>
      <Text
        pivot={{ from: "bottomLeft" }}
        position={{ x: 12, y: -8 }}
        size={{ x: size.x - 24, y: 16 }}
        font={{ size: 11, color: "#5f6368" }}
      >
        {`closest pair: ${pairA} and ${pairB}, ${Math.round(pairD)}px apart`}
      </Text>
    </>
  );
}

export function Playfield({ position }: { position: Vec2 }) {
  return (
    <Box
      name="playfield"
      position={position}
      size={{ x: 380, y: 360 }}
      border={{ width: 1, color: "#e0e0e0" }}
      style={{ backgroundColor: "#fff", borderRadius: "8px" }}
    >
      <PlayfieldLayout />
    </Box>
  );
}
