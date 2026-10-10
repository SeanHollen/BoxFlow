import { useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  Box,
  BoxRoot,
  Embed,
  Ellipse,
  Line,
  Polygon,
  BoxText,
  Arrange,
  resolvedAxis,
  useParentBoxProps,
} from "../src/index";
import type { PivotPair, Vec2 } from "../src/index";

function Recipe({
  position,
  width,
  demoHeight,
  title,
  css,
  children,
}: {
  position: Vec2;
  width: number;
  demoHeight?: number;
  title: string;
  css: string;
  children: ReactNode;
}) {
  return (
    <Box
      position={position}
      size={(_xt, yt) => ({ x: width, y: yt + 12, min: { y: 120 } })}
      border={{ width: 1, color: "#e0e0e0" }}
      style={{ backgroundColor: "#fff", borderRadius: "8px" }}
    >
      <BoxText
        stackMode="vertical"
        position={{ x: 12, y: 10 }}
        font={{ size: 13, weight: 600, color: "#202124" }}
      >
        {title}
      </BoxText>
      <BoxText
        stackMode="vertical"
        position={{ x: 0, y: 4 }}
        size={{ x: width - 24 }}
        font={{ size: 10, color: "#80868b" }}
      >
        {css}
      </BoxText>
      <Box stackMode="vertical" position={{ x: 0, y: 8 }} size={{ x: width - 24, y: demoHeight }}>
        {children}
      </Box>
    </Box>
  );
}

function useDemoSize(): Vec2 {
  const { size } = useParentBoxProps();
  return { x: resolvedAxis(size.x), y: resolvedAxis(size.y) };
}

const NAV_LINKS = ["Home", "Docs", "Pricing"];

function NavbarDemo() {
  const size = useDemoSize();
  return (
    <Box size={{ x: size.x, y: 44 }} style={{ backgroundColor: "#202124", borderRadius: "6px" }}>
      <BoxText
        pivot={{ from: "centerLeft" }}
        position={{ x: 12, y: 0 }}
        font={{ size: 13, weight: 600, color: "#fff" }}
      >
        {`Brand`}
      </BoxText>
      {NAV_LINKS.map((link) => (
        <BoxText
          key={link}
          stackMode="horizontal"
          position={{ x: 18, y: 0 }}
          font={{ size: 12, color: "#bdc1c6" }}
        >
          {link}
        </BoxText>
      ))}
      <BoxText
        pivot={{ from: "centerRight" }}
        position={{ x: -12, y: 0 }}
        font={{ size: 12, weight: 600, color: "#8ab4f8" }}
      >
        {`Sign in`}
      </BoxText>
    </Box>
  );
}

function Region({
  position,
  size,
  color,
  label,
  pivot,
}: {
  position?: Vec2;
  size: Vec2;
  color: string;
  label: string;
  pivot?: PivotPair;
}) {
  return (
    <Box
      position={position}
      size={size}
      pivot={pivot}
      style={{ backgroundColor: color, borderRadius: "4px" }}
    >
      <BoxText pivot="center" font={{ size: 9, color: "#3c4043" }}>
        {label}
      </BoxText>
    </Box>
  );
}

function HolyGrailDemo() {
  const size = useDemoSize();
  const middleH = size.y - 52;
  return (
    <>
      <Region size={{ x: size.x, y: 24 }} color="#aecbfa" label="header" />
      <Region position={{ x: 0, y: 28 }} size={{ x: 70, y: middleH }} color="#e8f0fe" label="nav" />
      <Region
        position={{ x: 74, y: 28 }}
        size={{ x: size.x - 148, y: middleH }}
        color="#f1f3f4"
        label="main"
      />
      <Region
        pivot={{ from: "topRight" }}
        position={{ x: 0, y: 28 }}
        size={{ x: 70, y: middleH }}
        color="#e8f0fe"
        label="aside"
      />
      <Region
        pivot={{ from: "bottomLeft" }}
        size={{ x: size.x, y: 20 }}
        color="#dadce0"
        label="footer"
      />
    </>
  );
}

const PRODUCTS = [
  { name: "Alpha", price: "$12", color: "#aecbfa" },
  { name: "Beta", price: "$18", color: "#a8dab5" },
  { name: "Gamma", price: "$24", color: "#fde293" },
];

function CardGridDemo() {
  const size = useDemoSize();
  const gap = 8;
  const columnWidth = (size.x - gap * 2) / 3;
  return (
    <>
      {PRODUCTS.map((product, i) => (
        <Box
          key={product.name}
          position={{ x: i * (columnWidth + gap), y: 0 }}
          size={{ x: columnWidth, y: size.y }}
          border={{ width: 1, color: "#e0e0e0" }}
          style={{ borderRadius: "6px" }}
        >
          <Box
            size={{ x: columnWidth - 2, y: 52 }}
            style={{ backgroundColor: product.color, borderRadius: "5px 5px 0 0" }}
          />
          <BoxText
            stackMode="vertical"
            position={{ x: 8, y: 8 }}
            font={{ size: 11, weight: 600, color: "#202124" }}
          >
            {product.name}
          </BoxText>
          <BoxText
            stackMode="vertical"
            position={{ x: 0, y: 2 }}
            font={{ size: 10, color: "#5f6368" }}
          >
            {product.price}
          </BoxText>
        </Box>
      ))}
    </>
  );
}

function MediaObjectDemo() {
  const size = useDemoSize();
  return (
    <>
      <Box size={{ x: 48, y: 48 }} style={{ backgroundColor: "#1a73e8", borderRadius: "24px" }}>
        <BoxText pivot="center" font={{ size: 14, weight: 600, color: "#fff" }}>
          {`AB`}
        </BoxText>
      </Box>
      <Box
        relativeTo="siblings"
        pivot={{ from: "topRight", to: "topLeft" }}
        position={{ x: 12, y: 0 }}
        size={{ x: size.x - 60 }}
      >
        <BoxText stackMode="vertical" font={{ size: 12, weight: 600, color: "#202124" }}>
          {`Ada Bell`}
        </BoxText>
        <BoxText
          stackMode="vertical"
          position={{ x: 0, y: 4 }}
          font={{ size: 11, color: "#5f6368" }}
        >
          {`Unsized text wraps at its parent's edge automatically, so this body copy fills the column beside the avatar without any width math.`}
        </BoxText>
      </Box>
    </>
  );
}

function HeroDemo() {
  const size = useDemoSize();
  return (
    <Box
      size={{ x: size.x, y: size.y }}
      style={{ background: "linear-gradient(135deg, #1a73e8, #9334e6)", borderRadius: "6px" }}
    >
      <BoxText
        pivot="center"
        position={{ x: 0, y: -6 }}
        font={{ size: 16, weight: 600, color: "#fff" }}
      >
        {`Centered over media`}
      </BoxText>
      <BoxText
        pivot="center"
        position={{ x: 0, y: 14 }}
        font={{ size: 10, color: "rgba(255,255,255,0.8)" }}
      >
        {`no transform: translate(-50%, -50%) required`}
      </BoxText>
      <BoxText
        pivot={{ from: "bottomRight" }}
        position={{ x: -8, y: -6 }}
        font={{ size: 9, color: "rgba(255,255,255,0.7)" }}
      >
        {`photo credit`}
      </BoxText>
    </Box>
  );
}

function BadgeDemo() {
  return (
    <>
      <Box
        position={{ x: 8, y: 42 }}
        size={{ x: 48, y: 48 }}
        style={{ backgroundColor: "#188038", borderRadius: "24px" }}
      >
        <BoxText pivot="center" font={{ size: 14, weight: 600, color: "#fff" }}>
          {`CD`}
        </BoxText>
        <Box
          pivot={{ from: "topRight", to: "center" }}
          position={{ x: -6, y: 6 }}
          size={{ x: 14, y: 14 }}
          border={{ width: 2, color: "#fff" }}
          style={{ backgroundColor: "#d93025", borderRadius: "7px" }}
        />
      </Box>
      <Box
        stackMode="verticalReverse"
        position={{ x: 0, y: -8 }}
        size={(xt, yt) => ({ x: xt + 6, y: yt + 4 })}
        style={{ backgroundColor: "#202124", borderRadius: "4px" }}
      >
        <BoxText position={{ x: 6, y: 4 }} font={{ size: 10, color: "#fff" }}>
          {`3 new messages`}
        </BoxText>
      </Box>
    </>
  );
}

function ProgressDemo() {
  const size = useDemoSize();
  const fraction = 0.64;
  return (
    <>
      <BoxText position={{ x: 0, y: 8 }} font={{ size: 11, color: "#3c4043" }}>
        {`Uploading…`}
      </BoxText>
      <BoxText
        pivot={{ from: "topRight" }}
        position={{ x: 0, y: 8 }}
        font={{ size: 11, color: "#5f6368" }}
      >
        {`64%`}
      </BoxText>
      <Box
        position={{ x: 0, y: 32 }}
        size={{ x: size.x, y: 8 }}
        style={{ backgroundColor: "#e8eaed", borderRadius: "4px" }}
      >
        <Box
          size={{ x: size.x * fraction, y: 8 }}
          style={{ backgroundColor: "#1a73e8", borderRadius: "4px" }}
        />
      </Box>
    </>
  );
}

function RotateFlipDemo() {
  return (
    <>
      <Box
        position={{ x: 24, y: 16 }}
        size={{ x: 130, y: 44 }}
        rotate={-5}
        style={{
          backgroundColor: "#fde293",
          borderRadius: "6px",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
        }}
      >
        <BoxText pivot="center" font={{ size: 12, weight: 600, color: "#3c4043" }}>
          {`rotated sticker`}
        </BoxText>
      </Box>
      <BoxText
        stackMode="vertical"
        position={{ x: 0, y: 14 }}
        size={{ x: -150, y: 16 }}
        font={{ size: 11, color: "#5f6368" }}
      >
        {`mirrored by size.x < 0`}
      </BoxText>
      <Box
        pivot={{ from: "topRight" }}
        position={{ x: -4, y: 70 }}
        size={{ x: 52, y: 22 }}
        dangerousPositionStyles={{ transform: "skewX(-12deg)" }}
        style={{ backgroundColor: "#ceead6", borderRadius: "4px" }}
      >
        <BoxText pivot="center" font={{ size: 9, color: "#188038" }}>
          {`skewed`}
        </BoxText>
      </Box>
    </>
  );
}

const GRID_CELLS = [
  ["Aa", "Bb", "Cc"],
  ["Dd", "Ee", "Ff"],
];

function CollapsedGridDemo() {
  const size = useDemoSize();
  const cellW = size.x / 3;
  const cellH = 36;
  return (
    <>
      <Box size={{ x: size.x, y: 18 }} border={{ width: 1, color: "#5f6368", sides: "bottom" }}>
        <BoxText
          pivot={{ from: "centerLeft" }}
          position={{ x: 2 }}
          font={{ size: 9, color: "#5f6368" }}
        >
          {`header — border sides: "bottom"`}
        </BoxText>
      </Box>
      {GRID_CELLS.flatMap((row, r) =>
        row.map((label, c) => (
          <Box
            key={label}
            position={{ x: c * cellW, y: 22 + r * cellH }}
            size={{ x: cellW, y: cellH }}
            border={{ width: 1, color: "#5f6368" }}
          >
            <BoxText pivot="center" font={{ size: 10, color: "#5f6368" }}>
              {label}
            </BoxText>
          </Box>
        )),
      )}
    </>
  );
}

function ShapesDemo() {
  const lineFrom = { x: 86, y: 40 };
  const lineTo = { x: 114, y: 44 };
  return (
    <>
      <Polygon
        points={[
          { x: 56, y: 10 },
          { x: 86, y: 40 },
          { x: 56, y: 70 },
          { x: 26, y: 40 },
        ]}
        fill="#fde293"
        stroke={{ width: 1.5, color: "#f9ab00" }}
      />
      <Ellipse
        center={{ x: 148, y: 44 }}
        radius={{ x: 34, y: 22 }}
        fill="#e8f0fe"
        stroke={{ width: 1.5, color: "#1a73e8" }}
      />
      <Line from={lineFrom} to={lineTo} stroke={{ width: 2, color: "#1a73e8", dash: [4, 4] }} />
      {[lineFrom, lineTo].map((p) => (
        <Ellipse key={`${p.x},${p.y}`} center={p} radius={4} fill="#1a73e8" stroke="none" />
      ))}
    </>
  );
}

function CssIslandsDemo() {
  return (
    <Embed name="css-islands">
      <div style={{ display: "flex", gap: 8 }}>
        <BoxRoot size={{ x: 86, y: 64 }} style={{ backgroundColor: "#e8f0fe", borderRadius: 6 }}>
          <BoxText pivot="center" font={{ size: 9, color: "#1a73e8" }}>
            {`size={{x, y}}`}
          </BoxText>
        </BoxRoot>
        <div style={{ width: 86, height: 64 }}>
          <BoxRoot fill="parent" style={{ backgroundColor: "#ceead6", borderRadius: 6 }}>
            <BoxText pivot="center" font={{ size: 9, color: "#188038" }}>
              {`fill="parent"`}
            </BoxText>
          </BoxRoot>
        </div>
      </div>
    </Embed>
  );
}

function HoverDemo() {
  const [hovered, setHovered] = useState<number | undefined>(undefined);
  const [overEllipse, setOverEllipse] = useState(false);
  const [clicks, setClicks] = useState(0);
  const chipColors = ["#fde293", "#e8f0fe", "#ceead6"];
  return (
    <>
      {chipColors.map((color, i) => (
        <Box
          key={color}
          name={`hover-chip-${i}`}
          stackMode="horizontal"
          position={{ x: i === 0 ? 0 : 8, y: 0 }}
          size={{ x: 40, y: 24 }}
          style={{
            backgroundColor: hovered === i ? "#202124" : color,
            borderRadius: "6px",
            cursor: "pointer",
            transition: "background-color 120ms",
          }}
          hover={{ onEnter: () => setHovered(i), onLeave: () => setHovered(undefined) }}
        />
      ))}
      <Box
        name="click-through-veil"
        clickThrough
        zValue={5}
        position={{ x: 0, y: 0 }}
        size={{ x: 136, y: 24 }}
        style={{
          background: "linear-gradient(90deg, rgba(26, 115, 232, 0.18), rgba(26, 115, 232, 0))",
          borderRadius: "6px",
        }}
      />
      <Ellipse
        name="hover-ellipse"
        center={{ x: 36, y: 56 }}
        radius={{ x: 32, y: 18 }}
        fill={overEllipse ? "#1a73e8" : "#e8f0fe"}
        stroke={{ width: 1.5, color: "#1a73e8" }}
        hover={{ onEnter: () => setOverEllipse(true), onLeave: () => setOverEllipse(false) }}
      />
      <Polygon
        name="hover-polygon"
        points={[
          { x: 108, y: 36 },
          { x: 136, y: 76 },
          { x: 80, y: 76 },
        ]}
        fill="#fde293"
        stroke={{ width: 1.5, color: "#f9ab00" }}
        onClick={() => setClicks((n) => n + 1)}
      />
      <BoxText position={{ x: 148, y: 40 }} font={{ size: 11, color: "#5f6368" }}>
        {hovered === undefined ? "hover a chip" : `chip ${hovered}`}
      </BoxText>
      <BoxText position={{ x: 148, y: 58 }} font={{ size: 11, color: "#5f6368" }}>
        {`${clicks} clicks`}
      </BoxText>
    </>
  );
}

interface RecipeSpec {
  title: string;
  css: string;
  w: number;
  demoH?: number;
  Demo: ComponentType;
}

const RECIPES: RecipeSpec[] = [
  {
    title: "Navbar",
    css: "CSS: flex + justify-content: space-between → edge pivots + a horizontal stack",
    w: 460,
    demoH: 44,
    Demo: NavbarDemo,
  },
  {
    title: "Holy grail layout",
    css: "CSS: grid-template-areas → sizes derived from the parent via useParentBoxProps()",
    w: 460,
    demoH: 160,
    Demo: HolyGrailDemo,
  },
  {
    title: "Card grid",
    css: "CSS: grid-template-columns: repeat(3, 1fr) → column width = (w − gaps) / 3",
    w: 460,
    demoH: 130,
    Demo: CardGridDemo,
  },
  {
    title: "Media object",
    css: "CSS: float/flex media pattern → sibling pivot beside the avatar, intrinsic wrap",
    w: 460,
    Demo: MediaObjectDemo,
  },
  {
    title: "Hero overlay",
    css: "CSS: absolute + transform centering over media → center pivots",
    w: 460,
    demoH: 110,
    Demo: HeroDemo,
  },
  {
    title: "Badge & tooltip",
    css: "CSS: absolute corner badge; tooltip above → pivot offsets + verticalReverse",
    w: 222,
    demoH: 96,
    Demo: BadgeDemo,
  },
  {
    title: "Progress bar",
    css: "CSS: width: 64% → fill width = parent width × fraction",
    w: 222,
    demoH: 48,
    Demo: ProgressDemo,
  },
  {
    title: "Collapsed grid",
    css: "CSS: border-collapse / border-bottom → overlay borders share edges; sides picks edges",
    w: 222,
    demoH: 94,
    Demo: CollapsedGridDemo,
  },
  {
    title: "Lines & polygons",
    css: "SVG shapes → <Line>, <Polygon>, <Ellipse>, drawn in parent coordinates",
    w: 222,
    demoH: 80,
    Demo: ShapesDemo,
  },
  {
    title: "CSS islands",
    css: "CSS: fixed-size / 100% containers → a nested BoxRoot per island, bridged by <Embed>",
    w: 222,
    demoH: 68,
    Demo: CssIslandsDemo,
  },
  {
    title: "Hover & click",
    css: "CSS: :hover / onClick → hover={{onEnter, onLeave}} and onClick on Box and shapes; shapes hit-test their geometry — a clickThrough veil sits above the chips",
    w: 222,
    demoH: 84,
    Demo: HoverDemo,
  },
  {
    title: "Rotate & flip",
    css: "CSS: transform rotate / scaleX(−1) → rotate prop + a negative size axis; skew via dangerousPositionStyles",
    w: 222,
    demoH: 104,
    Demo: RotateFlipDemo,
  },
];

export function Recipes() {
  const { size } = useParentBoxProps();
  const width = resolvedAxis(size.x);
  const height = resolvedAxis(size.y);
  return (
    <>
      <BoxText
        position={{ x: 24, y: 34 }}
        size={{ x: Math.max(200, width - 416) }}
        overflow={{ x: "ellipsis" }}
        font={{ size: 12, color: "#5f6368" }}
      >
        {`Familiar CSS patterns rebuilt with coordinates — each card names the CSS it replaces. The cards themselves flow via <Arrange> (CSS: grid auto-flow).`}
      </BoxText>
      <Box
        name="recipes"
        position={{ x: 24, y: 58 }}
        size={{ x: width - 48, y: height - 82 }}
        overflow={{ x: "clip", y: "scrollbar" }}
      >
        <Arrange
          items={RECIPES}
          render={(recipe, { prior, parentSize }) => {
            const last = prior[prior.length - 1];
            let x = 0;
            let y = 0;
            if (last) {
              x = last.right + 16;
              y = last.top;
              if (x + recipe.w > parentSize.x - 16) {
                x = 0;
                y = Math.max(...prior.map((r) => r.bottom)) + 16;
              }
            }
            return (
              <Recipe
                key={recipe.title}
                position={{ x, y }}
                width={recipe.w}
                demoHeight={recipe.demoH}
                title={recipe.title}
                css={recipe.css}
              >
                <recipe.Demo />
              </Recipe>
            );
          }}
        />
      </Box>
    </>
  );
}
