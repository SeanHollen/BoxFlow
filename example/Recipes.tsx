import type { ComponentType, ReactNode } from "react";
import { Box, Text, Wrap, resolvedAxis, useParentBoxProps } from "../src/index";
import type { Vec2 } from "../src/index";

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
  demoHeight: number | "childTotals";
  title: string;
  css: string;
  children: ReactNode;
}) {
  return (
    <Box
      position={position}
      size={(_xt, yt) => ({ x: width, y: yt + 12 })}
      border={{ width: 1, color: "#e0e0e0" }}
      style={{ backgroundColor: "#fff", borderRadius: "8px" }}
    >
      <Text
        stackMode="vertical"
        position={{ x: 12, y: 10 }}
        font={{ size: 13, weight: 600, color: "#202124" }}
      >
        {title}
      </Text>
      <Text
        stackMode="vertical"
        position={{ x: 0, y: 4 }}
        size={{ x: width - 24 }}
        font={{ size: 10, color: "#80868b" }}
      >
        {css}
      </Text>
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
    <Box
      position={{ x: 0, y: 0 }}
      size={{ x: size.x, y: 44 }}
      style={{ backgroundColor: "#202124", borderRadius: "6px" }}
    >
      <Text
        pivot={{ from: "centerLeft", to: "centerLeft" }}
        position={{ x: 12, y: 0 }}
        font={{ size: 13, weight: 600, color: "#fff" }}
      >
        {`Brand`}
      </Text>
      {NAV_LINKS.map((link) => (
        <Text
          key={link}
          stackMode="horizontal"
          position={{ x: 18, y: 0 }}
          font={{ size: 12, color: "#bdc1c6" }}
        >
          {link}
        </Text>
      ))}
      <Text
        pivot={{ from: "centerRight", to: "centerRight" }}
        position={{ x: -12, y: 0 }}
        font={{ size: 12, weight: 600, color: "#8ab4f8" }}
      >
        {`Sign in`}
      </Text>
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
  position: Vec2;
  size: Vec2;
  color: string;
  label: string;
  pivot?: { from: "topRight"; to: "topRight" } | { from: "bottomLeft"; to: "bottomLeft" };
}) {
  return (
    <Box
      position={position}
      size={size}
      pivot={pivot}
      style={{ backgroundColor: color, borderRadius: "4px" }}
    >
      <Text
        pivot={{ from: "center", to: "center" }}
        position={{ x: 0, y: 0 }}
        font={{ size: 9, color: "#3c4043" }}
      >
        {label}
      </Text>
    </Box>
  );
}

function HolyGrailDemo() {
  const size = useDemoSize();
  const middleH = size.y - 52;
  return (
    <>
      <Region
        position={{ x: 0, y: 0 }}
        size={{ x: size.x, y: 24 }}
        color="#aecbfa"
        label="header"
      />
      <Region position={{ x: 0, y: 28 }} size={{ x: 70, y: middleH }} color="#e8f0fe" label="nav" />
      <Region
        position={{ x: 74, y: 28 }}
        size={{ x: size.x - 148, y: middleH }}
        color="#f1f3f4"
        label="main"
      />
      <Region
        pivot={{ from: "topRight", to: "topRight" }}
        position={{ x: 0, y: 28 }}
        size={{ x: 70, y: middleH }}
        color="#e8f0fe"
        label="aside"
      />
      <Region
        pivot={{ from: "bottomLeft", to: "bottomLeft" }}
        position={{ x: 0, y: 0 }}
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
            position={{ x: 0, y: 0 }}
            size={{ x: columnWidth - 2, y: 52 }}
            style={{ backgroundColor: product.color, borderRadius: "5px 5px 0 0" }}
          />
          <Text
            stackMode="vertical"
            position={{ x: 8, y: 8 }}
            font={{ size: 11, weight: 600, color: "#202124" }}
          >
            {product.name}
          </Text>
          <Text
            stackMode="vertical"
            position={{ x: 0, y: 2 }}
            font={{ size: 10, color: "#5f6368" }}
          >
            {product.price}
          </Text>
        </Box>
      ))}
    </>
  );
}

function MediaObjectDemo() {
  const size = useDemoSize();
  return (
    <>
      <Box
        position={{ x: 0, y: 0 }}
        size={{ x: 48, y: 48 }}
        style={{ backgroundColor: "#1a73e8", borderRadius: "24px" }}
      >
        <Text
          pivot={{ from: "center", to: "center" }}
          position={{ x: 0, y: 0 }}
          font={{ size: 14, weight: 600, color: "#fff" }}
        >
          {`AB`}
        </Text>
      </Box>
      <Box
        relativeTo="siblings"
        pivot={{ from: "topRight", to: "topLeft" }}
        position={{ x: 12, y: 0 }}
        size={{ x: size.x - 60, y: "childTotals" }}
      >
        <Text
          stackMode="vertical"
          position={{ x: 0, y: 0 }}
          font={{ size: 12, weight: 600, color: "#202124" }}
        >
          {`Ada Bell`}
        </Text>
        <Text stackMode="vertical" position={{ x: 0, y: 4 }} font={{ size: 11, color: "#5f6368" }}>
          {`Unsized text wraps at its parent's edge automatically, so this body copy fills the column beside the avatar without any width math.`}
        </Text>
      </Box>
    </>
  );
}

function HeroDemo() {
  const size = useDemoSize();
  return (
    <Box
      position={{ x: 0, y: 0 }}
      size={{ x: size.x, y: size.y }}
      style={{ background: "linear-gradient(135deg, #1a73e8, #9334e6)", borderRadius: "6px" }}
    >
      <Text
        pivot={{ from: "center", to: "center" }}
        position={{ x: 0, y: -6 }}
        font={{ size: 16, weight: 600, color: "#fff" }}
      >
        {`Centered over media`}
      </Text>
      <Text
        pivot={{ from: "center", to: "center" }}
        position={{ x: 0, y: 14 }}
        font={{ size: 10, color: "rgba(255,255,255,0.8)" }}
      >
        {`no transform: translate(-50%, -50%) required`}
      </Text>
      <Text
        pivot={{ from: "bottomRight", to: "bottomRight" }}
        position={{ x: -8, y: -6 }}
        font={{ size: 9, color: "rgba(255,255,255,0.7)" }}
      >
        {`photo credit`}
      </Text>
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
        <Text
          pivot={{ from: "center", to: "center" }}
          position={{ x: 0, y: 0 }}
          font={{ size: 14, weight: 600, color: "#fff" }}
        >
          {`CD`}
        </Text>
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
        <Text position={{ x: 6, y: 4 }} font={{ size: 10, color: "#fff" }}>
          {`3 new messages`}
        </Text>
      </Box>
    </>
  );
}

function ProgressDemo() {
  const size = useDemoSize();
  const fraction = 0.64;
  return (
    <>
      <Text position={{ x: 0, y: 8 }} font={{ size: 11, color: "#3c4043" }}>
        {`Uploading…`}
      </Text>
      <Text
        pivot={{ from: "topRight", to: "topRight" }}
        position={{ x: 0, y: 8 }}
        font={{ size: 11, color: "#5f6368" }}
      >
        {`64%`}
      </Text>
      <Box
        position={{ x: 0, y: 32 }}
        size={{ x: size.x, y: 8 }}
        style={{ backgroundColor: "#e8eaed", borderRadius: "4px" }}
      >
        <Box
          position={{ x: 0, y: 0 }}
          size={{ x: size.x * fraction, y: 8 }}
          style={{ backgroundColor: "#1a73e8", borderRadius: "4px" }}
        />
      </Box>
    </>
  );
}

function EscapeHatchDemo() {
  return (
    <Box
      position={{ x: 24, y: 16 }}
      size={{ x: 130, y: 44 }}
      dangerousPositionStyles={{ transform: "rotate(-5deg)" }}
      style={{
        backgroundColor: "#fde293",
        borderRadius: "6px",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
      }}
    >
      <Text
        pivot={{ from: "center", to: "center" }}
        position={{ x: 0, y: 0 }}
        font={{ size: 12, weight: 600, color: "#3c4043" }}
      >
        {`rotated sticker`}
      </Text>
    </Box>
  );
}

interface RecipeSpec {
  title: string;
  css: string;
  w: number;
  demoH: number | "childTotals";
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
    demoH: "childTotals",
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
    title: "Escape hatch",
    css: "CSS you genuinely need → dangerousPositionStyles={{ transform: rotate(−5°) }}",
    w: 222,
    demoH: 76,
    Demo: EscapeHatchDemo,
  },
];

export function Recipes() {
  const { size } = useParentBoxProps();
  const width = resolvedAxis(size.x);
  const height = resolvedAxis(size.y);
  return (
    <>
      <Text
        position={{ x: 24, y: 34 }}
        size={{ x: Math.max(200, width - 416) }}
        font={{ size: 12, color: "#5f6368" }}
      >
        {`Familiar CSS patterns rebuilt with coordinates — each card names the CSS it replaces. The cards themselves flow via <Wrap> (CSS: grid auto-flow).`}
      </Text>
      <Box
        name="recipes"
        position={{ x: 24, y: 58 }}
        size={{ x: width - 48, y: height - 82 }}
        overflow={{ x: "clip", y: "scrollbar" }}
      >
        <Wrap
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
