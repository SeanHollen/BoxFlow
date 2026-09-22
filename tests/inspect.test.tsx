import { beforeAll, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Box, BoxRoot, Text } from "../src/index";
import type { InspectNode } from "../src/index";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 800,
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 600,
  });
});

describe("layout inspection", () => {
  it("exposes a JSON tree of named boxes with corner coordinates", () => {
    render(
      <BoxRoot inspect>
        <Box name="outer" position={{ x: 10, y: 20 }} size={{ x: 200, y: 100 }}>
          <Box name="inner" position={{ x: 5, y: 5 }} size={{ x: 50, y: 30 }} />
          <Text name="label" position={{ x: 5, y: 40 }}>
            {`hi`}
          </Text>
        </Box>
      </BoxRoot>,
    );
    const snapshot = (
      window as unknown as Record<string, () => { tree: InspectNode[] }>
    ).__boxflowTree?.();
    expect(snapshot).toBeTruthy();
    const tree = snapshot?.tree ?? [];
    expect(tree).toHaveLength(1);
    expect(tree[0]?.kind).toBe("box");
    expect(tree[0]?.name).toBe("outer");
    expect(tree[0]?.children).toHaveLength(2);
    expect(tree[0]?.children[1]?.kind).toBe("text");
    expect(tree[0]?.children[1]?.name).toBe("label");
    const corners = tree[0]?.corners;
    expect(corners).toEqual({
      topLeft: { x: 0, y: 0 },
      topRight: { x: 0, y: 0 },
      bottomRight: { x: 0, y: 0 },
      bottomLeft: { x: 0, y: 0 },
    });
  });

  it("registers no global when inspect is off", () => {
    delete (window as unknown as Record<string, unknown>).__boxflowTree;
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 10, y: 10 }} />
      </BoxRoot>,
    );
    expect((window as unknown as Record<string, unknown>).__boxflowTree).toBeUndefined();
  });
});
