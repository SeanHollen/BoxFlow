import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Box, BoxRoot, Embed } from "../src/index";

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
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get: () => 150,
  });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => 40,
  });
});

describe("Embed", () => {
  it("measures foreign content so a hugging parent counts it", () => {
    render(
      <BoxRoot>
        <Box name="panel">
          <Embed>
            <form data-testid="form" />
          </Embed>
          <span data-testid="marker" />
        </Box>
      </BoxRoot>,
    );
    const panel = screen.getByTestId("marker").parentElement;
    expect(panel?.style.width).toBe("150px");
    expect(panel?.style.height).toBe("40px");
  });

  it("gives stacked siblings a real rectangle to attach to", () => {
    render(
      <BoxRoot>
        <Embed>
          <form />
        </Embed>
        <Box stackMode="vertical" position={{ x: 0, y: 8 }} size={{ x: 50, y: 20 }}>
          <span data-testid="stacked" />
        </Box>
      </BoxRoot>,
    );
    const stacked = screen.getByTestId("stacked").parentElement;
    expect(stacked?.style.top).toBe("48px");
    expect(stacked?.style.left).toBe("0px");
  });

  it("fixes a given axis and measures the other", () => {
    render(
      <BoxRoot>
        <Box name="panel">
          <Embed size={{ x: 200 }}>
            <form data-testid="form" />
          </Embed>
          <span data-testid="marker" />
        </Box>
      </BoxRoot>,
    );
    const embedEl = screen.getByTestId("form").parentElement;
    expect(embedEl?.style.width).toBe("200px");
    const panel = screen.getByTestId("marker").parentElement;
    expect(panel?.style.width).toBe("200px");
    expect(panel?.style.height).toBe("40px");
  });

  it("positions with pivots like any box", () => {
    render(
      <BoxRoot>
        <Box size={{ x: 400, y: 300 }}>
          <Embed pivot={{ from: "bottomRight" }} position={{ x: -10, y: -10 }}>
            <form data-testid="form" />
          </Embed>
        </Box>
      </BoxRoot>,
    );
    const el = screen.getByTestId("form").parentElement;
    expect(el?.style.left).toBe("390px");
    expect(el?.style.top).toBe("290px");
    expect(el?.style.transform).toBe("translate(-100%, -100%)");
  });
});
