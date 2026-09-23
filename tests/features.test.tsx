import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  Box,
  BoxRoot,
  Image,
  Inset,
  Line,
  Polygon,
  Text,
  Arrange,
  useParentScroll,
} from "../src/index";
import type { ArrangeItemContext } from "../src/index";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 800,
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 600,
  });
});

describe("zValue", () => {
  it("ranks numeric zValues lowest to highest", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 50, y: 50 }} zValue={5}>
          <span data-testid="a" />
        </Box>
        <Box position={{ x: 10, y: 10 }} size={{ x: 50, y: 50 }} zValue={2}>
          <span data-testid="b" />
        </Box>
      </BoxRoot>,
    );
    const a = screen.getByTestId("a").parentElement;
    const b = screen.getByTestId("b").parentElement;
    expect(Number(a?.style.zIndex)).toBeGreaterThan(Number(b?.style.zIndex));
  });

  it("leaves boxes without zValue unranked", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 50, y: 50 }}>
          <span data-testid="a" />
        </Box>
      </BoxRoot>,
    );
    expect(screen.getByTestId("a").parentElement?.style.zIndex).toBe("");
  });

  it("sorts non-numbers with default string comparison", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 50, y: 50 }} zValue="beta">
          <span data-testid="beta" />
        </Box>
        <Box position={{ x: 10, y: 10 }} size={{ x: 50, y: 50 }} zValue="alpha">
          <span data-testid="alpha" />
        </Box>
      </BoxRoot>,
    );
    const beta = screen.getByTestId("beta").parentElement;
    const alpha = screen.getByTestId("alpha").parentElement;
    expect(Number(beta?.style.zIndex)).toBeGreaterThan(Number(alpha?.style.zIndex));
  });

  it("uses the parent's zSort for arbitrary zValue objects", () => {
    const low = { priority: 1 };
    const high = { priority: 9 };
    render(
      <BoxRoot>
        <Box
          position={{ x: 0, y: 0 }}
          size={{ x: 200, y: 200 }}
          zSort={(a, b) =>
            (a as { priority: number }).priority - (b as { priority: number }).priority
          }
        >
          <Box position={{ x: 0, y: 0 }} size={{ x: 50, y: 50 }} zValue={high}>
            <span data-testid="high" />
          </Box>
          <Box position={{ x: 10, y: 10 }} size={{ x: 50, y: 50 }} zValue={low}>
            <span data-testid="low" />
          </Box>
        </Box>
      </BoxRoot>,
    );
    const highEl = screen.getByTestId("high").parentElement;
    const lowEl = screen.getByTestId("low").parentElement;
    expect(Number(highEl?.style.zIndex)).toBeGreaterThan(Number(lowEl?.style.zIndex));
  });
});

describe("reverse stacking", () => {
  it("stacks upward with verticalReverse", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 5, y: 100 }} size={{ x: 40, y: 20 }} stackMode="verticalReverse">
          <span data-testid="a" />
        </Box>
        <Box position={{ x: 0, y: -4 }} size={{ x: 40, y: 20 }} stackMode="verticalReverse">
          <span data-testid="b" />
        </Box>
      </BoxRoot>,
    );
    const a = screen.getByTestId("a").parentElement;
    const b = screen.getByTestId("b").parentElement;
    expect(a?.style.top).toBe("80px");
    expect(b?.style.top).toBe("56px");
    expect(b?.style.left).toBe("5px");
  });

  it("stacks leftward with horizontalReverse", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 200, y: 0 }} size={{ x: 50, y: 20 }} stackMode="horizontalReverse">
          <span data-testid="a" />
        </Box>
        <Box position={{ x: -8, y: 0 }} size={{ x: 50, y: 20 }} stackMode="horizontalReverse">
          <span data-testid="b" />
        </Box>
      </BoxRoot>,
    );
    const a = screen.getByTestId("a").parentElement;
    const b = screen.getByTestId("b").parentElement;
    expect(a?.style.left).toBe("150px");
    expect(b?.style.left).toBe("92px");
  });
});

function ScrollProbe() {
  const { offset } = useParentScroll();
  return <span data-testid="offset">{`${offset.x},${offset.y}`}</span>;
}

describe("useParentScroll", () => {
  it("reports the scroll offset of the nearest scrollable box", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 100, y: 100 }} overflow={{ y: "scrollbar" }}>
          <Box position={{ x: 0, y: 0 }} size={{ x: 50, y: 400 }} />
          <ScrollProbe />
        </Box>
      </BoxRoot>,
    );
    expect(screen.getByTestId("offset").textContent).toBe("0,0");
    const scroller = screen.getByTestId("offset").parentElement as HTMLElement;
    scroller.scrollTop = 40;
    fireEvent.scroll(scroller);
    expect(screen.getByTestId("offset").textContent).toBe("0,40");
  });
});

describe("Image", () => {
  it("stretches the img to its box", () => {
    render(
      <BoxRoot>
        <Image position={{ x: 5, y: 6 }} size={{ x: 80, y: 60 }} src="sprite.png" alt="sprite" />
      </BoxRoot>,
    );
    const img = screen.getByAltText("sprite");
    expect(img.style.objectFit).toBe("");
    expect(img.style.width).toBe("100%");
    const box = img.parentElement;
    expect(box?.style.left).toBe("5px");
    expect(box?.style.width).toBe("80px");
  });
});

describe("shapes", () => {
  it("draws a Line in parent coordinates with stroke padding", () => {
    const view = render(
      <BoxRoot>
        <Box size={{ x: 400, y: 300 }}>
          <Line from={{ x: 10, y: 20 }} to={{ x: 110, y: 80 }} stroke={{ width: 2 }} />
        </Box>
      </BoxRoot>,
    );
    const svg = view.container.querySelector("svg") as SVGSVGElement;
    expect(svg.style.left).toBe("8px");
    expect(svg.style.top).toBe("18px");
    expect(svg.style.width).toBe("104px");
    expect(svg.style.height).toBe("64px");
    const line = svg.querySelector("line") as SVGLineElement;
    expect(line.getAttribute("x1")).toBe("2");
    expect(line.getAttribute("y1")).toBe("2");
    expect(line.getAttribute("x2")).toBe("102");
    expect(line.getAttribute("y2")).toBe("62");
    expect(line.getAttribute("stroke-width")).toBe("2");
  });

  it("draws a Polygon from a point list", () => {
    const view = render(
      <BoxRoot>
        <Polygon
          points={[
            { x: 20, y: 10 },
            { x: 60, y: 10 },
            { x: 40, y: 50 },
          ]}
          fill="#fde293"
        />
      </BoxRoot>,
    );
    const polygon = view.container.querySelector("polygon") as SVGPolygonElement;
    expect(polygon.getAttribute("fill")).toBe("#fde293");
    expect(polygon.getAttribute("points")).toBe("1,1 41,1 21,41");
    const svg = polygon.ownerSVGElement as SVGSVGElement;
    expect(svg.style.left).toBe("19px");
    expect(svg.style.top).toBe("9px");
  });

  it("never affects sibling stacking or childTotals", () => {
    render(
      <BoxRoot>
        <Box>
          <Box size={{ x: 50, y: 20 }} />
          <Line from={{ x: 0, y: 0 }} to={{ x: 500, y: 500 }} />
          <Box stackMode="vertical" position={{ x: 0, y: 4 }} size={{ x: 50, y: 20 }}>
            <span data-testid="stacked" />
          </Box>
        </Box>
      </BoxRoot>,
    );
    const stacked = screen.getByTestId("stacked").parentElement;
    expect(stacked?.style.top).toBe("24px");
    const parent = stacked?.parentElement;
    expect(parent?.style.width).toBe("50px");
    expect(parent?.style.height).toBe("44px");
  });
});

describe("Image proportional sizing", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
      configurable: true,
      get: () => 100,
    });
    Object.defineProperty(HTMLImageElement.prototype, "naturalHeight", {
      configurable: true,
      get: () => 50,
    });
  });

  it("derives the missing axis from the natural aspect ratio", () => {
    render(
      <BoxRoot>
        <Image size={{ x: 200 }} src="sprite.png" alt="wide" />
      </BoxRoot>,
    );
    fireEvent.load(screen.getByAltText("wide"));
    const box = screen.getByAltText("wide").parentElement;
    expect(box?.style.width).toBe("200px");
    expect(box?.style.height).toBe("100px");
  });

  it("uses the natural size when no size is given", () => {
    render(
      <BoxRoot>
        <Image src="sprite.png" alt="natural" />
      </BoxRoot>,
    );
    fireEvent.load(screen.getByAltText("natural"));
    const box = screen.getByAltText("natural").parentElement;
    expect(box?.style.width).toBe("100px");
    expect(box?.style.height).toBe("50px");
  });

  it("keeps the flip sign while deriving proportionally", () => {
    render(
      <BoxRoot>
        <Image size={{ y: -100 }} src="sprite.png" alt="flipped" />
      </BoxRoot>,
    );
    fireEvent.load(screen.getByAltText("flipped"));
    const box = screen.getByAltText("flipped").parentElement;
    expect(box?.style.width).toBe("200px");
    expect(box?.style.height).toBe("100px");
    expect(box?.style.transform).toContain("scaleY(-1)");
  });
});

describe("rotate and negative-size flips", () => {
  it("rotates paint without touching layout", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 10, y: 20 }} size={{ x: 50, y: 30 }} rotate={-5}>
          <span data-testid="content" />
        </Box>
      </BoxRoot>,
    );
    const el = screen.getByTestId("content").parentElement;
    expect(el?.style.left).toBe("10px");
    expect(el?.style.width).toBe("50px");
    expect(el?.style.transform).toContain("rotate(-5deg)");
  });

  it("flips content on a negative axis while laying out the magnitude", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 10, y: 20 }} size={{ x: -50, y: 30 }}>
          <span data-testid="content" />
        </Box>
      </BoxRoot>,
    );
    const el = screen.getByTestId("content").parentElement;
    expect(el?.style.width).toBe("50px");
    expect(el?.style.left).toBe("10px");
    expect(el?.style.transform).toContain("scaleX(-1)");
  });

  it("counts flipped boxes by magnitude in childTotals", () => {
    render(
      <BoxRoot>
        <Box>
          <Box size={{ x: -50, y: -20 }}>
            <span data-testid="content" />
          </Box>
        </Box>
      </BoxRoot>,
    );
    const parent = screen.getByTestId("content").parentElement?.parentElement;
    expect(parent?.style.width).toBe("50px");
    expect(parent?.style.height).toBe("20px");
  });
});

describe("Arrange", () => {
  function renderChip(_color: string, context: ArrangeItemContext) {
    const last = context.prior[context.prior.length - 1];
    let x = 0;
    let y = 0;
    if (last) {
      x = last.right + 10;
      y = last.top;
      if (x + 40 > context.parentSize.x) {
        x = 0;
        y = last.bottom + 10;
      }
    }
    return (
      <Box position={{ x, y }} size={{ x: 40, y: 20 }}>
        <span data-testid={`chip-${context.index}`} />
      </Box>
    );
  }

  it("gives each item the rects of all prior items", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 100 }}>
          <Arrange items={["a", "b", "c"]} render={renderChip} />
        </Box>
      </BoxRoot>,
    );
    const c0 = screen.getByTestId("chip-0").parentElement;
    const c1 = screen.getByTestId("chip-1").parentElement;
    const c2 = screen.getByTestId("chip-2").parentElement;
    expect(c0?.style.left).toBe("0px");
    expect(c1?.style.left).toBe("50px");
    expect(c1?.style.top).toBe("0px");
    expect(c2?.style.left).toBe("0px");
    expect(c2?.style.top).toBe("30px");
  });

  it("registers items with the enclosing box, so childTotals wraps them", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 100 }}>
          <Arrange items={["a", "b", "c"]} render={renderChip} />
        </Box>
      </BoxRoot>,
    );
    const parentBox = screen.getByTestId("chip-0").parentElement?.parentElement;
    expect(parentBox?.style.height).toBe("50px");
  });
});

describe("Text baseline", () => {
  it("anchors position.y at the first line's baseline", () => {
    render(
      <BoxRoot>
        <Text baseline position={{ x: 0, y: 100 }} font={{ size: 20 }}>
          {`hi`}
        </Text>
      </BoxRoot>,
    );
    expect(screen.getByText("hi").style.top).toBe("84px");
  });
});

describe("Inset", () => {
  it("floats a sized box inside Text content", () => {
    render(
      <BoxRoot>
        <Text position={{ x: 0, y: 0 }} size={{ x: 200 }}>
          <Inset side="left" size={{ x: 30, y: 30 }} />
          {`words flow around the inset`}
        </Text>
      </BoxRoot>,
    );
    const textEl = screen.getByText(/words flow/);
    const inset = textEl.firstElementChild as HTMLElement;
    expect(inset.style.float).toBe("left");
    expect(inset.style.width).toBe("30px");
    expect(inset.style.height).toBe("30px");
    expect(inset.style.marginRight).toBe("8px");
    expect(textEl.style.display).toBe("flow-root");
  });
});

describe("sticky", () => {
  it("pins with native CSS sticky instead of JS-lagged offsets", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 100, y: 200 }} overflow={{ y: "scrollbar" }}>
          <Box sticky position={{ x: 4, y: 6 }} size={{ x: 80, y: 20 }} zValue={1}>
            <span data-testid="head" />
          </Box>
        </Box>
      </BoxRoot>,
    );
    const el = screen.getByTestId("head").parentElement;
    expect(el?.style.position).toBe("sticky");
    expect(el?.style.top).toBe("6px");
    expect(el?.style.marginLeft).toBe("4px");
    expect(el?.style.width).toBe("80px");
    expect(el?.style.zIndex).toBe("1");
  });
});

describe("dangerousPositionStyles", () => {
  it("overrides computed layout when explicitly invoked", () => {
    render(
      <BoxRoot>
        <Box
          position={{ x: 10, y: 0 }}
          size={{ x: 50, y: 20 }}
          dangerousPositionStyles={{ left: 200, padding: 4 }}
        >
          <span data-testid="content" />
        </Box>
      </BoxRoot>,
    );
    const el = screen.getByTestId("content").parentElement;
    expect(el?.style.left).toBe("200px");
    expect(el?.style.padding).toBe("4px");
  });
});

describe("Text ellipsis", () => {
  it("ellipsizes a fixed-width single line", () => {
    render(
      <BoxRoot>
        <Text position={{ x: 0, y: 0 }} size={{ x: 80 }} overflow={{ x: "ellipsis" }}>
          {`a very long label that cannot possibly fit`}
        </Text>
      </BoxRoot>,
    );
    const el = screen.getByText(/very long label/);
    expect(el.style.overflowX).toBe("hidden");
    expect(el.style.textOverflow).toBe("ellipsis");
    expect(el.style.whiteSpace).toBe("nowrap");
  });
});
