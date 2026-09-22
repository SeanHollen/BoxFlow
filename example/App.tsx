import { useState } from "react";
import { Box, BoxRoot, Text, resolvedAxis, useParentBoxProps } from "../src/index";
import { TopBars } from "./TopBars";
import { CenteredCard } from "./CenteredCard";
import { CornerBadge } from "./CornerBadge";
import { Playfield } from "./Playfield";
import { AutoPanel } from "./AutoPanel";
import { Playground } from "./Playground";
import { Recipes } from "./Recipes";
import { TabBar } from "./TabBar";
import type { Tab } from "./TabBar";

function Demos() {
  return (
    <>
      <TopBars />
      <Playfield position={{ x: 24, y: 56 }} />
      <AutoPanel position={{ x: 428, y: 56 }} />
      <CenteredCard position={{ x: 796, y: 56 }} />
      <CornerBadge />
    </>
  );
}

function PlaygroundArea() {
  const parentProps = useParentBoxProps();
  const width = resolvedAxis(parentProps.size.x);
  const height = resolvedAxis(parentProps.size.y);
  return (
    <Box
      position={{ x: 24, y: 64 }}
      size={{ x: width - 48, y: height - 88 }}
      border={{ width: 1, color: "#dadce0", style: "dashed" }}
      style={{ borderRadius: "8px" }}
    >
      <Text
        pivot={{ from: "bottomRight" }}
        position={{ x: -12, y: -8 }}
        font={{ size: 11, color: "#bdc1c6", style: "italic" }}
      >
        {`add boxes in example/Playground.tsx`}
      </Text>
      <Playground />
    </Box>
  );
}

function CurrentTab({ tab }: { tab: Tab }) {
  if (tab === "demos") return <Demos />;
  if (tab === "recipes") return <Recipes />;
  return <PlaygroundArea />;
}

export function App() {
  const [tab, setTab] = useState<Tab>("demos");
  return (
    <BoxRoot debug inspect size={{ min: { x: 1160 } }} style={{ backgroundColor: "#fafafa" }}>
      <TabBar tab={tab} onSelect={setTab} />
      <CurrentTab tab={tab} />
    </BoxRoot>
  );
}
