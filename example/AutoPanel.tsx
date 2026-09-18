import { Box, Inset, Text, Wrap, useParentBoxProps } from "../src/index";
import type { StackMode, TextStyle, Vec2 } from "../src/index";

const WRAP_COLORS = [
  "#1a73e8",
  "#188038",
  "#d93025",
  "#f9ab00",
  "#9334e6",
  "#e8710a",
  "#12805c",
  "#5f6368",
];

const SAMPLES: { label: string; style: TextStyle | TextStyle[] }[] = [
  { label: "bold", style: "bold" },
  { label: "italic", style: "italic" },
  { label: "underline", style: "underline" },
  { label: "strikethrough", style: "strikethrough" },
  { label: "bold italic underline", style: ["bold", "italic", "underline"] },
];

function Chip({
  color,
  stackMode,
  position = { x: 0, y: 0 },
}: {
  color: string;
  stackMode?: StackMode;
  position?: Vec2;
}) {
  return (
    <Box
      stackMode={stackMode}
      position={position}
      size={{ x: 16, y: 16 }}
      style={{ backgroundColor: color, borderRadius: "4px" }}
    />
  );
}

function ChipShelf() {
  return (
    <Box stackMode="vertical" position={{ x: 0, y: 12 }}>
      <Box position={{ x: 0, y: 0 }} style={{ backgroundColor: "#f1f3f4", borderRadius: "4px" }}>
        <Chip color="#1a73e8" />
        <Chip stackMode="horizontal" position={{ x: 8, y: 0 }} color="#188038" />
        <Chip stackMode="horizontal" position={{ x: 8, y: 0 }} color="#d93025" />
      </Box>
      <Box
        relativeTo="siblings"
        pivot={{ from: "topRight", to: "topLeft" }}
        position={{ x: 12, y: 0 }}
        size={{ x: 40, y: "childTotals" }}
        style={{ backgroundColor: "#f1f3f4", borderRadius: "4px" }}
      >
        <Chip position={{ x: 12, y: 0 }} color="#f9ab00" />
        <Chip stackMode="vertical" position={{ x: 0, y: 8 }} color="#1a73e8" />
      </Box>
    </Box>
  );
}

function PanelContent() {
  const { size } = useParentBoxProps();
  return (
    <>
      <Text
        stackMode="vertical"
        position={{ x: 12, y: 12 }}
        font={{ size: 14, color: "#202124", style: "bold", letterSpacing: 0.3 }}
      >
        {`Auto-sized panel — childTotals & stacking`}
      </Text>
      <Text stackMode="vertical" position={{ x: 0, y: 4 }} font={{ size: 11, color: "#80868b" }}>
        {`size={(xt, yt) => ...} wraps this content; rows stack`}
      </Text>
      {SAMPLES.map((sample) => (
        <Text
          key={sample.label}
          stackMode="vertical"
          position={{ x: 0, y: 8 }}
          font={{ size: 13, color: "#3c4043", style: sample.style }}
        >
          {sample.label}
        </Text>
      ))}
      <Text
        stackMode="vertical"
        position={{ x: 0, y: 10 }}
        font={{ size: 11, color: "#5f6368", style: "italic" }}
      >
        {`width reported to children: ${String(size.x)}`}
      </Text>
      <Text stackMode="vertical" position={{ x: 0, y: 12 }} font={{ size: 11, color: "#80868b" }}>
        {`childTotals strips; the second placed with a sibling pivot pair:`}
      </Text>
      <ChipShelf />
      <Text
        stackMode="vertical"
        position={{ x: 0, y: 12 }}
        size={{ x: 180 }}
        font={{ size: 11, color: "#5f6368", align: "center", lineHeight: 1.4 }}
      >
        {`This paragraph wraps at a fixed width of 180px, centers its lines, and grows as tall as it needs to.`}
      </Text>
      <Text
        stackMode="vertical"
        position={{ x: 0, y: 10 }}
        size={{ y: 42 }}
        font={{ size: 11, color: "#5f6368" }}
      >
        {`This text fits a fixed 42px height and finds its own narrowest width.`}
      </Text>
      <Text
        stackMode="vertical"
        position={{ x: 0, y: 10 }}
        size={{ x: 180 }}
        overflow={{ x: "ellipsis" }}
        font={{ size: 11, color: "#5f6368" }}
      >
        {`This 180px line ellipsizes instead of wrapping or spilling over.`}
      </Text>
      <Box stackMode="vertical" position={{ x: 0, y: 12 }}>
        <Text
          baseline
          position={{ x: 0, y: 20 }}
          font={{ size: 22, weight: 600, color: "#202124" }}
        >
          {`$42`}
        </Text>
        <Text baseline position={{ x: 50, y: 20 }} font={{ size: 11, color: "#5f6368" }}>
          {`/month — baseline-aligned`}
        </Text>
      </Box>
      <Box stackMode="vertical" position={{ x: 0, y: 12 }} size={{ x: 180, y: "childTotals" }}>
        <Wrap
          items={WRAP_COLORS}
          render={(color, { prior, parentSize }) => {
            const last = prior[prior.length - 1];
            let x = 0;
            let y = 0;
            if (last) {
              x = last.right + 8;
              y = last.top;
              if (x + 16 > parentSize.x) {
                x = 0;
                y = last.bottom + 8;
              }
            }
            return <Chip key={color} position={{ x, y }} color={color} />;
          }}
        />
      </Box>
      <Text
        stackMode="vertical"
        position={{ x: 0, y: 12 }}
        size={{ x: 180 }}
        font={{ size: 11, color: "#5f6368" }}
      >
        <Inset
          side="left"
          size={{ x: 28, y: 28 }}
          style={{ backgroundColor: "#a8c7fa", borderRadius: "6px" }}
        />
        {`An Inset floats inside Text, and these words flow around it the way CSS floats do.`}
      </Text>
    </>
  );
}

export function AutoPanel() {
  return (
    <Box
      name="auto-panel"
      position={{ x: 428, y: 56 }}
      size={(xt, yt) => ({ x: xt + 24, y: yt + 24 })}
      border={{ width: 1, color: "#e0e0e0" }}
      style={{ backgroundColor: "#fff", borderRadius: "8px" }}
    >
      <PanelContent />
    </Box>
  );
}
