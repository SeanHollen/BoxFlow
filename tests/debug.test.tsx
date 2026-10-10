import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Box, BoxRoot, BoxText } from "../src/index";

function TextProbe() {
  return <BoxText position={{ x: 0, y: 0 }}>{`hello world`}</BoxText>;
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class PointerEventStub extends MouseEvent {
  pointerId: number;
  constructor(type: string, init?: MouseEventInit & { pointerId?: number }) {
    super(type, init);
    this.pointerId = init?.pointerId ?? 0;
  }
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("PointerEvent", PointerEventStub);
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

  it("shows the panel immediately and toggles with the key combo", () => {
    renderDemo(true);
    expect(screen.getByText("BoxFlow debug")).toBeTruthy();
    pressCombo();
    expect(screen.queryByText("BoxFlow debug")).toBeNull();
    pressCombo();
    expect(screen.getByText("BoxFlow debug")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("outline boxes"));
    const el = screen.getByTestId("content").parentElement;
    expect(el?.style.outline).toContain("1px solid");
  });

  it("closes the panel with the close button", () => {
    renderDemo(true);
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
    fireEvent.click(screen.getByTestId("content").parentElement as HTMLElement);
    expect(screen.getByText(/selected: box “hero”/)).toBeTruthy();
    expect(screen.getByText(/^id /).textContent).toMatch(/^id .+/);
  });

  it("falls back to text content as the name for BoxText elements", () => {
    render(
      <BoxRoot debug>
        <Box position={{ x: 0, y: 0 }} size={{ x: 200, y: 100 }}>
          <TextProbe />
        </Box>
      </BoxRoot>,
    );
    fireEvent.click(screen.getByText("hello world"));
    expect(screen.getByText(/selected: text “hello world”/)).toBeTruthy();
  });

  it("selects a box on click and injects prop overrides", () => {
    renderDemo(true);
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
    const el = screen.getByTestId("content").parentElement;
    fireEvent.click(el as HTMLElement);
    const textarea = screen.getByLabelText("props json");
    fireEvent.change(textarea, { target: { value: `{ "position": { "x": "wide" } }` } });
    fireEvent.click(screen.getByText("Apply"));
    expect(screen.getByText(/expected number/)).toBeTruthy();
    expect(el?.style.left).toBe("10px");
  });
});

describe("drag to edit", () => {
  function handles(el: HTMLElement) {
    return {
      position: el.querySelector('[data-bc-handle="position"]') as HTMLElement | null,
      resize: el.querySelector('[data-bc-handle="resize"]') as HTMLElement | null,
    };
  }

  it("shows handles only when the checkbox is on, and only where values are numeric", () => {
    render(
      <BoxRoot debug>
        <Box position={{ x: 10, y: 20 }} size={{ x: 50, y: 30 }}>
          <span data-testid="plain" />
        </Box>
        <Box position={{ x: 100, y: 20 }} size={() => ({ x: 80, y: 40 })}>
          <span data-testid="fnsized" />
        </Box>
      </BoxRoot>,
    );
    const plain = screen.getByTestId("plain").parentElement as HTMLElement;
    expect(handles(plain).position).toBeNull();
    fireEvent.click(screen.getByLabelText("drag to edit"));
    expect(handles(plain).position).toBeTruthy();
    expect(handles(plain).resize).toBeTruthy();
    const fnsized = screen.getByTestId("fnsized").parentElement as HTMLElement;
    expect(handles(fnsized).position).toBeTruthy();
    expect(handles(fnsized).resize).toBeNull();
  });

  it("dragging the position handle moves the box live", () => {
    renderDemo(true);
    fireEvent.click(screen.getByLabelText("drag to edit"));
    const el = screen.getByTestId("content").parentElement as HTMLElement;
    const handle = el.querySelector('[data-bc-handle="position"]') as HTMLElement;
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 15, clientY: -5, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 15, clientY: -5, pointerId: 1 });
    expect(el.style.left).toBe("25px");
    expect(el.style.top).toBe("15px");
  });

  it("resizing drags numeric axes and leaves function axes alone", () => {
    render(
      <BoxRoot debug>
        <Box position={{ x: 0, y: 0 }} size={{ x: 100, y: (yt) => yt + 40 }}>
          <span data-testid="content" />
        </Box>
      </BoxRoot>,
    );
    fireEvent.click(screen.getByLabelText("drag to edit"));
    const el = screen.getByTestId("content").parentElement as HTMLElement;
    const handle = el.querySelector('[data-bc-handle="resize"]') as HTMLElement;
    expect(handle).toBeTruthy();
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 20, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 20, clientY: 50, pointerId: 1 });
    expect(el.style.width).toBe("120px");
    expect(el.style.height).toBe("40px");
  });
});
