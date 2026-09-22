import { Box } from "../src";

export function Playground() {
  return recursive(10);
}

function recursive(depth: number) {
  return depth <= 0 ? (
    <Box
      position={{ x: 10, y: 20 }}
      size={{ x: 100, y: 100 }}
      border={{ width: 1, color: "black" }}
    ></Box>
  ) : (
    <Box
      size={(xt, yt) => ({ x: xt + 30, y: yt + 40 })}
      position={{ x: 10, y: 20 }}
      border={{ width: 10, color: "red" }}
    >
      {recursive(depth - 1)}
    </Box>
  );
}
