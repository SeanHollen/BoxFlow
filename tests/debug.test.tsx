import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Box, BoxRoot, Text } from "../src/index";

function TextProbe() {
  return <Text position={{ x: 0, y: 0 }}>{`hello world`}</Text>;
}

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

function pressCombo() {
  fireEvent.keyDown(document, { key: "D", ctrlKey: true, shiftKey: true });
}

function renderDemo(debug: boolean) {
  return render(
    <BoxRoot debug={debug}>
      <Box position={{ x: 10, y: 20 }} size={{ x: 50, y: 30 }}>
        <span data-testid="content" />
      </Box>
    </BoxRoot>,
  );
}

describe("debug mode", () => {
  it("stays inert when debug is off", () => {
    renderDemo(false);
    pressCombo();
    expect(screen.queryByText("BoxFlow debug")).toBeNull();
  });

  it("opens the panel with the key combo and outlines boxes", () => {
    renderDemo(true);
    expect(screen.queryByText("BoxFlow debug")).toBeNull();
    pressCombo();
    expect(screen.getByText("BoxFlow debug")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("outline boxes"));
    const el = screen.getByTestId("content").parentElement;
    expect(el?.style.outline).toContain("1px solid");
    pressCombo();
    expect(screen.queryByText("BoxFlow debug")).toBeNull();
  });

  it("closes the panel with the close button", () => {
    renderDemo(true);
    pressCombo();
    expect(screen.getByText("BoxFlow debug")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("close debug panel"));
    expect(screen.queryByText("BoxFlow debug")).toBeNull();
  });

  it("highlights fixed-size boxes with unused space when toggled", () => {
    render(
      <BoxRoot debug>
        <Box position={{ x: 0, y: 0 }} size={{ x: 200, y: 200 }}>
          <Box position={{ x: 0, y: 0 }} size={{ x: 50, y: 20 }}>
            <span data-testid="content" />
          </Box>
        </Box>
      </BoxRoot>,
    );
    pressCombo();
    fireEvent.click(screen.getByLabelText("highlight dead space"));
    const outer = screen.getByTestId("content").parentElement?.parentElement;
    const inner = screen.getByTestId("content").parentElement;
    expect(outer?.style.backgroundImage).toContain("repeating-linear-gradient");
    expect(inner?.style.backgroundImage).toBe("");
  });

  it("shows the selected element's name and id", () => {
    render(
      <BoxRoot debug>
        <Box name="hero" position={{ x: 0, y: 0 }} size={{ x: 50, y: 30 }}>
          <span data-testid="content" />
        </Box>
      </BoxRoot>,
    );
    pressCombo();
    fireEvent.click(screen.getByTestId("content").parentElement as HTMLElement);
    expect(screen.getByText(/selected: box “hero”/)).toBeTruthy();
    expect(screen.getByText(/^id /).textContent).toMatch(/^id .+/);
  });

  it("falls back to text content as the name for Text elements", () => {
    render(
      <BoxRoot debug>
        <Box position={{ x: 0, y: 0 }} size={{ x: 200, y: 100 }}>
          <TextProbe />
        </Box>
      </BoxRoot>,
    );
    pressCombo();
    fireEvent.click(screen.getByText("hello world"));
    expect(screen.getByText(/selected: text “hello world”/)).toBeTruthy();
  });

  it("selects a box on click and injects prop overrides", () => {
    renderDemo(true);
    pressCombo();
    const el = screen.getByTestId("content").parentElement;
    expect(el).toBeTruthy();
    fireEvent.click(el as HTMLElement);
    const textarea = screen.getByLabelText("props json");
    fireEvent.change(textarea, {
      target: { value: JSON.stringify({ position: { x: 99, y: 20 }, size: { x: 70, y: 30 } }) },
    });
    fireEvent.click(screen.getByText("Apply"));
    expect(el?.style.left).toBe("99px");
    expect(el?.style.width).toBe("70px");
    fireEvent.click(screen.getByText("Clear override"));
    expect(el?.style.left).toBe("10px");
  });

  it("accepts the (function) size placeholder it wrote itself", () => {
    render(
      <BoxRoot debug>
        <Box position={{ x: 10, y: 20 }} size={() => ({ x: 120, y: 40 })}>
          <span data-testid="content" />
        </Box>
      </BoxRoot>,
    );
    pressCombo();
    const el = screen.getByTestId("content").parentElement;
    fireEvent.click(el as HTMLElement);
    fireEvent.click(screen.getByText("Apply"));
    expect(screen.queryByText(/Invalid/)).toBeNull();
    expect(el?.style.width).toBe("120px");
    fireEvent.change(screen.getByLabelText("props json"), {
      target: { value: JSON.stringify({ position: { x: 50, y: 20 }, size: "(function)" }) },
    });
    fireEvent.click(screen.getByText("Apply"));
    expect(el?.style.left).toBe("50px");
    expect(el?.style.width).toBe("120px");
  });

  it("rejects invalid override JSON with an inline error", () => {
    renderDemo(true);
    pressCombo();
    const el = screen.getByTestId("content").parentElement;
    fireEvent.click(el as HTMLElement);
    const textarea = screen.getByLabelText("props json");
    fireEvent.change(textarea, { target: { value: `{ "position": { "x": "wide" } }` } });
    fireEvent.click(screen.getByText("Apply"));
    expect(screen.getByText(/expected number/)).toBeTruthy();
    expect(el?.style.left).toBe("10px");
  });
});
