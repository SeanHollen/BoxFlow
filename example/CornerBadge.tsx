import { Box, Text } from "../src/index";

export function CornerBadge() {
  return (
    <>
      <Box
        name="corner-badge"
        pivot={{ from: "bottomRight", to: "bottomRight" }}
        position={{ x: -16, y: -16 }}
        size={(xt) => ({ x: xt + 24, y: 36 })}
        border={{ width: 1, color: "#e0e0e0" }}
        style={{ backgroundColor: "#fff", borderRadius: "6px" }}
      >
        <Text
          pivot={{ from: "centerLeft", to: "centerLeft" }}
          position={{ x: 12, y: 0 }}
          font={{ size: 13, color: "#5f6368" }}
        >
          {`pivot bottomRight pins this badge`}
        </Text>
      </Box>
      <Text
        stackMode="verticalReverse"
        position={{ x: 0, y: -8 }}
        font={{ size: 10, color: "#9aa0a6" }}
      >
        {`stacked above via stackMode="verticalReverse"`}
      </Text>
    </>
  );
}
