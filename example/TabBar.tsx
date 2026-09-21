import { Box } from "../src/index";

export type Tab = "demos" | "recipes" | "playground";

function TabButton({
  label,
  active,
  first,
  onClick,
}: {
  label: string;
  active: boolean;
  first?: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      stackMode={first ? undefined : "horizontal"}
      position={first ? { x: 0, y: 0 } : { x: 8, y: 0 }}
      size={{ x: 104, y: 32 }}
      border={{ width: 1, color: active ? "#1a73e8" : "#dadce0" }}
      style={{ borderRadius: "6px", backgroundColor: active ? "#e8f0fe" : "#fff" }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          width: "100%",
          height: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "system-ui, sans-serif",
          fontSize: "13px",
          color: active ? "#1a73e8" : "#3c4043",
        }}
      >
        {label}
      </button>
    </Box>
  );
}

export function TabBar({ tab, onSelect }: { tab: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <Box pivot={{ from: "topRight" }} position={{ x: -24, y: 16 }} size="childTotals">
      <TabButton first label="Demos" active={tab === "demos"} onClick={() => onSelect("demos")} />
      <TabButton
        label="CSS recipes"
        active={tab === "recipes"}
        onClick={() => onSelect("recipes")}
      />
      <TabButton
        label="Playground"
        active={tab === "playground"}
        onClick={() => onSelect("playground")}
      />
    </Box>
  );
}
