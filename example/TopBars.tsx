import { Box, Text, resolvedAxis, useParentBoxProps } from "../src/index";

export function TopBars() {
  const { size } = useParentBoxProps();
  const width = resolvedAxis(size.x);
  return (
    <>
      <Box
        position={{ x: 0, y: 0 }}
        size={{ x: width / 2, y: 5 }}
        style={{ backgroundColor: "#1a73e8" }}
      />
      <Box
        stackMode="horizontal"
        position={{ x: 0, y: 0 }}
        size={{ x: width / 2, y: 5 }}
        style={{ backgroundColor: "#a8c7fa" }}
      />
      <Text position={{ x: 24, y: 11 }} font={{ size: 11, color: "#80868b" }}>
        {`top bars: sized from the root via useParentBoxProps(), second half attached with stackMode="horizontal"`}
      </Text>
    </>
  );
}
