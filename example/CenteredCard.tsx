import { Box, Text, resolvedAxis, useParentBoxProps, useParentScroll } from "../src/index";
import type { Vec2 } from "../src/index";

const ITEMS = Array.from({ length: 30 }, (_, i) => `Row ${i + 1}`);

function CardHeader() {
  const parentProps = useParentBoxProps({ countBorder: true });
  const { offset } = useParentScroll();
  return (
    <Box
      name="card-header"
      position={{ x: 0, y: offset.y }}
      size={{ x: resolvedAxis(parentProps.size.x), y: 58 }}
      zValue={1}
      style={{ backgroundColor: "#fff", borderRadius: "8px 8px 0 0" }}
    >
      <Text position={{ x: 12, y: 12 }} font={{ size: 15, weight: 600, color: "#202124" }}>
        {`Scrollable card — overflow & sticky`}
      </Text>
      <Text position={{ x: 12, y: 34 }} font={{ size: 11, color: "#80868b" }}>
        {`sticky header via useParentScroll() and zValue; rows scroll beneath`}
      </Text>
    </Box>
  );
}

function CardRows() {
  const parentProps = useParentBoxProps({ countBorder: true });
  const size = { x: resolvedAxis(parentProps.size.x), y: resolvedAxis(parentProps.size.y) };
  return (
    <>
      {ITEMS.map((label, i) => (
        <Box
          key={label}
          position={{ x: 12, y: 66 + i * 32 }}
          size={{ x: size.x - 24, y: 28 }}
          style={{
            backgroundColor: i % 2 === 0 ? "#f1f3f4" : "#fff",
            borderRadius: "4px",
          }}
        >
          <Text
            pivot={{ from: "centerLeft", to: "centerLeft" }}
            position={{ x: 10, y: 0 }}
            font={{ size: 13, color: "#3c4043" }}
          >
            {label}
          </Text>
        </Box>
      ))}
    </>
  );
}

export function CenteredCard({ position }: { position: Vec2 }) {
  return (
    <Box
      name="card"
      position={position}
      size={{ x: 320, y: 400 }}
      overflow={{ x: "clip", y: "scrollbar" }}
      border={{ width: 1, color: "#e0e0e0" }}
      style={{ backgroundColor: "#fff", borderRadius: "8px" }}
    >
      <CardHeader />
      <CardRows />
    </Box>
  );
}
