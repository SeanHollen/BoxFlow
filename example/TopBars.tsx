import { Box, Text, resolvedAxis, useParentBoxProps } from "../src/index";

export function TopBars() {
  const { size } = useParentBoxProps();
  const width = resolvedAxis(size.x);
  return (
    <>
      <Box size={{ x: width / 2, y: 5 }} style={{ backgroundColor: "#1a73e8" }} />
      <Box
        stackMode="horizontal"
        size={{ x: width / 2, y: 5 }}
        style={{ backgroundColor: "#a8c7fa" }}
      />
      <Text
        position={{ x: 24, y: 11 }}
        size={{ x: Math.max(200, width - 416) }}
        overflow={{ x: "ellipsis" }}
        font={{ size: 11, color: "#80868b" }}
      >
        {`top bars: sized from the root via useParentBoxProps(), second half attached with stackMode="horizontal"`}
      </Text>
    </>
  );
}
