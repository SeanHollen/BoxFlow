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

  it("sits at the parent's origin; the enclosing Box does the positioning", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 30, y: 12 }} stackMode="vertical">
          <Embed>
            <span data-testid="content" />
          </Embed>
        </Box>
      </BoxRoot>,
    );
    const el = screen.getByTestId("content").parentElement;
    expect(el?.style.left).toBe("0px");
    expect(el?.style.top).toBe("0px");
    expect(el?.style.transform).toBe("");
  });

  it("lays out at max-content inside a content-hugging parent instead of wrapping to it", () => {
    render(
      <BoxRoot>
        <Box stackMode="vertical">
          <Embed>
            <span data-testid="content">{`{"FullyConnected":10}`}</span>
            <button>{`Add Layer Below`}</button>
          </Embed>
        </Box>
      </BoxRoot>,
    );
    const el = screen.getByTestId("content").parentElement;
    expect(el?.style.width).toBe("max-content");
    expect(el?.style.maxWidth).toBe("");
  });

  it("wraps at a fixed-width parent's edge while the parent's height hugs it", () => {
    render(
      <BoxRoot>
        <Box size={{ x: 200 }}>
          <Embed>
            <form data-testid="form" />
          </Embed>
          <span data-testid="marker" />
        </Box>
      </BoxRoot>,
    );
    const el = screen.getByTestId("form").parentElement;
    expect(el?.style.width).toBe("max-content");
    expect(el?.style.maxWidth).toBe("200px");
    const panel = screen.getByTestId("marker").parentElement;
    expect(panel?.style.height).toBe("40px");
  });
});
