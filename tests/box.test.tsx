import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Box, BoxRoot, Text, useParentBoxProps } from "../src/index";

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

function SizeProbe() {
  const { size } = useParentBoxProps();
  return <span data-testid="probe">{`${size.x},${size.y}`}</span>;
}

describe("BoxRoot", () => {
  it("provides its measured size to children", () => {
    render(
      <BoxRoot>
        <SizeProbe />
      </BoxRoot>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("800,600");
  });

  it("defaults to auto overflow, overridable", () => {
    const view = render(<BoxRoot />);
    const root = view.container.firstElementChild as HTMLElement;
    expect(root.style.overflowX).toBe("auto");
    const clipped = render(<BoxRoot overflow={{ x: "clip", y: "clip" }} />);
    const clippedRoot = clipped.container.firstElementChild as HTMLElement;
    expect(clippedRoot.style.overflowX).toBe("hidden");
  });

  it("floors the anchor space with minSize while measuring smaller", () => {
    render(
      <BoxRoot minSize={{ x: 1200, y: 0 }}>
        <SizeProbe />
      </BoxRoot>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("1200,600");
  });
});

describe("minSize", () => {
  it("floors the coordinate space without growing the visual box", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 100, y: 50 }} minSize={{ x: 300, y: 50 }}>
          <Box
            pivot={{ from: "topRight", to: "topRight" }}
            position={{ x: 0, y: 0 }}
            size={{ x: 40, y: 20 }}
          >
            <span data-testid="content" />
          </Box>
          <SizeProbe />
        </Box>
      </BoxRoot>,
    );
    const outer = screen.getByTestId("content").parentElement?.parentElement;
    const inner = screen.getByTestId("content").parentElement;
    expect(outer?.style.width).toBe("100px");
    expect(inner?.style.left).toBe("260px");
    expect(screen.getByTestId("probe").textContent).toBe("300,50");
  });
});

describe("Box", () => {
  it("provides its own size to children, not the root's", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 400, y: 0 }} size={{ x: 400, y: 5 }}>
          <SizeProbe />
        </Box>
      </BoxRoot>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("400,5");
  });

  it("renders absolute coordinates resolved against the from pivot", () => {
    render(
      <BoxRoot>
        <Box
          pivot={{ from: "center", to: "center" }}
          position={{ x: 0, y: 0 }}
          size={{ x: 100, y: 50 }}
        >
          <span data-testid="content" />
        </Box>
      </BoxRoot>,
    );
    const el = screen.getByTestId("content").parentElement;
    expect(el?.style.position).toBe("absolute");
    expect(el?.style.left).toBe("350px");
    expect(el?.style.top).toBe("275px");
    expect(el?.style.width).toBe("100px");
    expect(el?.style.height).toBe("50px");
  });

  it("maps overflow modes to CSS per axis", () => {
    render(
      <BoxRoot>
        <Box
          position={{ x: 0, y: 0 }}
          size={{ x: 100, y: 50 }}
          overflow={{ x: "clip", y: "scrollbar" }}
        >
          <span data-testid="content" />
        </Box>
      </BoxRoot>,
    );
    const el = screen.getByTestId("content").parentElement;
    expect(el?.style.overflowX).toBe("hidden");
    expect(el?.style.overflowY).toBe("scroll");
  });

  it("throws when rendered outside a BoxRoot", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Box position={{ x: 0, y: 0 }} size={{ x: 10, y: 10 }} />)).toThrowError(
      /useParentBoxProps/,
    );
    spy.mockRestore();
  });
});

function BorderProbe() {
  const outer = useParentBoxProps();
  const inner = useParentBoxProps({ countBorder: true });
  return (
    <span data-testid="border-probe">
      {`${outer.size.x},${outer.size.y};${inner.size.x},${inner.size.y}`}
    </span>
  );
}

describe("Box with a border", () => {
  it("renders the border and keeps the declared outer size", () => {
    render(
      <BoxRoot>
        <Box
          position={{ x: 0, y: 0 }}
          size={{ x: 200, y: 100 }}
          border={{ width: 5, color: "#e0e0e0" }}
        >
          <span data-testid="content" />
        </Box>
      </BoxRoot>,
    );
    const el = screen.getByTestId("content").parentElement;
    expect(el?.style.width).toBe("200px");
    expect(el?.style.height).toBe("100px");
    expect(el?.style.border).toBe("5px solid rgb(224, 224, 224)");
  });

  it("reports the inner size when countBorder is true", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 200, y: 100 }} border={{ width: 5 }}>
          <BorderProbe />
        </Box>
      </BoxRoot>,
    );
    expect(screen.getByTestId("border-probe").textContent).toBe("200,100;190,90");
  });

  it("anchors children to the padding box of a bordered parent", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 200, y: 100 }} border={{ width: 5 }}>
          <Box
            pivot={{ from: "bottomRight", to: "bottomRight" }}
            position={{ x: 0, y: 0 }}
            size={{ x: 50, y: 20 }}
          >
            <span data-testid="inner" />
          </Box>
        </Box>
      </BoxRoot>,
    );
    const el = screen.getByTestId("inner").parentElement;
    expect(el?.style.left).toBe("140px");
    expect(el?.style.top).toBe("70px");
  });
});

describe("child-driven sizing", () => {
  it("sizes to the extent of its children with childTotals", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size="childTotals">
          <Box position={{ x: 10, y: 10 }} size={{ x: 50, y: 20 }} />
          <Box position={{ x: 30, y: 40 }} size={{ x: 50, y: 20 }}>
            <span data-testid="content" />
          </Box>
        </Box>
      </BoxRoot>,
    );
    const parent = screen.getByTestId("content").parentElement?.parentElement;
    expect(parent?.style.width).toBe("80px");
    expect(parent?.style.height).toBe("60px");
  });

  it("mixes a fixed axis with a child-driven axis", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 10, y: "childTotals" }}>
          <Box position={{ x: 0, y: 15 }} size={{ x: 5, y: 30 }}>
            <span data-testid="content" />
          </Box>
        </Box>
      </BoxRoot>,
    );
    const parent = screen.getByTestId("content").parentElement?.parentElement;
    expect(parent?.style.width).toBe("10px");
    expect(parent?.style.height).toBe("45px");
  });

  it("supports a size function of the child totals", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={(xt, yt) => ({ x: xt + 1, y: yt + 2 })}>
          <Box position={{ x: 10, y: 10 }} size={{ x: 50, y: 20 }} />
          <Box position={{ x: 30, y: 40 }} size={{ x: 50, y: 20 }}>
            <span data-testid="content" />
          </Box>
        </Box>
      </BoxRoot>,
    );
    const parent = screen.getByTestId("content").parentElement?.parentElement;
    expect(parent?.style.width).toBe("81px");
    expect(parent?.style.height).toBe("62px");
  });

  it("shrinks when a child unmounts", () => {
    const view = render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size="childTotals">
          <Box position={{ x: 10, y: 10 }} size={{ x: 50, y: 20 }}>
            <span data-testid="content" />
          </Box>
          <Box position={{ x: 30, y: 40 }} size={{ x: 50, y: 20 }} />
        </Box>
      </BoxRoot>,
    );
    view.rerender(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size="childTotals">
          <Box position={{ x: 10, y: 10 }} size={{ x: 50, y: 20 }}>
            <span data-testid="content" />
          </Box>
        </Box>
      </BoxRoot>,
    );
    const parent = screen.getByTestId("content").parentElement?.parentElement;
    expect(parent?.style.width).toBe("60px");
    expect(parent?.style.height).toBe("30px");
  });

  it("counts stacked children as start-anchored", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size="childTotals">
          <Box stackMode="vertical" position={{ x: 0, y: 10 }} size={{ x: 50, y: 20 }} />
          <Box stackMode="vertical" position={{ x: 0, y: 8 }} size={{ x: 50, y: 20 }}>
            <span data-testid="content" />
          </Box>
        </Box>
      </BoxRoot>,
    );
    const parent = screen.getByTestId("content").parentElement?.parentElement;
    expect(parent?.style.width).toBe("50px");
    expect(parent?.style.height).toBe("58px");
  });

  it("defaults size to childTotals when omitted", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }}>
          <Box position={{ x: 10, y: 10 }} size={{ x: 50, y: 20 }}>
            <span data-testid="content" />
          </Box>
        </Box>
      </BoxRoot>,
    );
    const parent = screen.getByTestId("content").parentElement?.parentElement;
    expect(parent?.style.width).toBe("60px");
    expect(parent?.style.height).toBe("30px");
  });

  it("reports the childTotals sentinel to children instead of a number", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 10, y: "childTotals" }}>
          <SizeProbe />
        </Box>
      </BoxRoot>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("10,childTotals");
  });
});

describe("sibling-relative placement", () => {
  it("stacks boxes vertically with stackMode", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 5, y: 7 }} size={{ x: 100, y: 20 }} stackMode="vertical">
          <span data-testid="a" />
        </Box>
        <Box position={{ x: 0, y: 4 }} size={{ x: 100, y: 20 }} stackMode="vertical">
          <span data-testid="b" />
        </Box>
        <Box position={{ x: 0, y: 4 }} size={{ x: 100, y: 20 }} stackMode="vertical">
          <span data-testid="c" />
        </Box>
      </BoxRoot>,
    );
    const a = screen.getByTestId("a").parentElement;
    const b = screen.getByTestId("b").parentElement;
    const c = screen.getByTestId("c").parentElement;
    expect(a?.style.top).toBe("7px");
    expect(b?.style.top).toBe("31px");
    expect(c?.style.top).toBe("55px");
    expect(b?.style.left).toBe("5px");
    expect(c?.style.left).toBe("5px");
  });

  it("stacks boxes horizontally with stackMode", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 0, y: 0 }} size={{ x: 50, y: 20 }} stackMode="horizontal">
          <span data-testid="a" />
        </Box>
        <Box position={{ x: 8, y: 0 }} size={{ x: 50, y: 20 }} stackMode="horizontal">
          <span data-testid="b" />
        </Box>
      </BoxRoot>,
    );
    const b = screen.getByTestId("b").parentElement;
    expect(b?.style.left).toBe("58px");
    expect(b?.style.top).toBe("0px");
  });

  it("supports explicit pivot pairs against the previous sibling", () => {
    render(
      <BoxRoot>
        <Box position={{ x: 100, y: 40 }} size={{ x: 60, y: 30 }}>
          <span data-testid="a" />
        </Box>
        <Box
          relativeTo="siblings"
          pivot={{ from: "topRight", to: "topLeft" }}
          position={{ x: 10, y: 0 }}
          size={{ x: 20, y: 30 }}
        >
          <span data-testid="b" />
        </Box>
      </BoxRoot>,
    );
    const b = screen.getByTestId("b").parentElement;
    expect(b?.style.left).toBe("170px");
    expect(b?.style.top).toBe("40px");
  });

  it("rejects pivot combined with stackMode", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <BoxRoot>
          <Box
            position={{ x: 0, y: 0 }}
            size={{ x: 10, y: 10 }}
            stackMode="vertical"
            pivot={{ from: "center", to: "center" }}
          />
        </BoxRoot>,
      ),
    ).toThrowError(/stackMode/);
    spy.mockRestore();
  });
});

describe("Text", () => {
  it("positions like a Box and applies font props as CSS", () => {
    render(
      <BoxRoot>
        <Text
          position={{ x: 20, y: 10 }}
          size={{ x: 200, y: 36 }}
          font={{ size: 13, color: "#5f6368", weight: 600 }}
        >
          {`hello`}
        </Text>
      </BoxRoot>,
    );
    const el = screen.getByText("hello");
    expect(el.style.position).toBe("absolute");
    expect(el.style.left).toBe("20px");
    expect(el.style.top).toBe("10px");
    expect(el.style.fontSize).toBe("13px");
    expect(el.style.color).toBe("rgb(95, 99, 104)");
    expect(el.style.fontWeight).toBe("600");
  });

  it("aligns wrapped lines with font.align", () => {
    render(
      <BoxRoot>
        <Text position={{ x: 0, y: 0 }} size={{ x: 120 }} font={{ align: "center" }}>
          {`hello world again`}
        </Text>
      </BoxRoot>,
    );
    expect(screen.getByText("hello world again").style.textAlign).toBe("center");
  });

  it("applies combined font styles", () => {
    render(
      <BoxRoot>
        <Text
          position={{ x: 0, y: 0 }}
          size={{ x: 100, y: 20 }}
          font={{ style: ["bold", "italic", "underline"] }}
        >
          {`hello`}
        </Text>
      </BoxRoot>,
    );
    const el = screen.getByText("hello");
    expect(el.style.fontWeight).toBe("bold");
    expect(el.style.fontStyle).toBe("italic");
    expect(el.style.textDecoration).toBe("underline");
  });

  it("accepts a single font style and maps strikethrough", () => {
    render(
      <BoxRoot>
        <Text position={{ x: 0, y: 0 }} size={{ x: 100, y: 20 }} font={{ style: "strikethrough" }}>
          {`hello`}
        </Text>
      </BoxRoot>,
    );
    expect(screen.getByText("hello").style.textDecoration).toBe("line-through");
  });

  it("lets an explicit weight win over the bold style", () => {
    render(
      <BoxRoot>
        <Text
          position={{ x: 0, y: 0 }}
          size={{ x: 100, y: 20 }}
          font={{ weight: 300, style: "bold" }}
        >
          {`hello`}
        </Text>
      </BoxRoot>,
    );
    expect(screen.getByText("hello").style.fontWeight).toBe("300");
  });

  it("defaults to a system font family", () => {
    render(
      <BoxRoot>
        <Text position={{ x: 0, y: 0 }} size={{ x: 100, y: 20 }}>
          {`hello`}
        </Text>
      </BoxRoot>,
    );
    expect(screen.getByText("hello").style.fontFamily).toBe("system-ui, sans-serif");
  });
});

describe("Text intrinsic sizing", () => {
  it("sizes unsized text intrinsically, wrapping only at the parent's edge", () => {
    render(
      <BoxRoot>
        <Text position={{ x: 20, y: 10 }}>{`hello world`}</Text>
      </BoxRoot>,
    );
    const el = screen.getByText("hello world");
    expect(el.style.position).toBe("absolute");
    expect(el.style.left).toBe("20px");
    expect(el.style.top).toBe("10px");
    expect(el.style.whiteSpace).toBe("");
    expect(el.style.width).toBe("");
    expect(el.style.height).toBe("");
  });

  it("wraps at a fixed width with free height when only x is set", () => {
    render(
      <BoxRoot>
        <Text position={{ x: 0, y: 0 }} size={{ x: 80 }}>
          {`hello world`}
        </Text>
      </BoxRoot>,
    );
    const el = screen.getByText("hello world");
    expect(el.style.width).toBe("80px");
    expect(el.style.height).toBe("");
    expect(el.style.whiteSpace).not.toBe("nowrap");
  });

  it("fixes the height and wraps when only y is set", () => {
    render(
      <BoxRoot>
        <Text position={{ x: 0, y: 0 }} size={{ y: 60 }}>
          {`hello world`}
        </Text>
      </BoxRoot>,
    );
    const el = screen.getByText("hello world");
    expect(el.style.height).toBe("60px");
    expect(el.style.whiteSpace).not.toBe("nowrap");
  });

  it("sizes non-left-pivoted intrinsic text as max-content so transforms align truly", () => {
    render(
      <BoxRoot>
        <Text pivot={{ from: "center", to: "center" }} position={{ x: 0, y: 0 }}>
          {`hello centered`}
        </Text>
      </BoxRoot>,
    );
    const el = screen.getByText("hello centered");
    expect(el.style.width).toBe("max-content");
    expect(el.style.maxWidth).toBe("800px");
  });

  it("offsets its own pivot with a percentage transform", () => {
    render(
      <BoxRoot>
        <Text position={{ x: 0, y: 0 }} pivot={{ from: "bottomRight", to: "bottomRight" }}>
          {`hello`}
        </Text>
      </BoxRoot>,
    );
    const el = screen.getByText("hello");
    expect(el.style.left).toBe("800px");
    expect(el.style.top).toBe("600px");
    expect(el.style.transform).toBe("translate(-100%, -100%)");
  });

  it("keeps the fixed-box path when both axes are set", () => {
    render(
      <BoxRoot>
        <Text position={{ x: 0, y: 0 }} size={{ x: 100, y: 20 }}>
          {`hello`}
        </Text>
      </BoxRoot>,
    );
    const el = screen.getByText("hello");
    expect(el.style.width).toBe("100px");
    expect(el.style.height).toBe("20px");
    expect(el.style.transform).toBe("");
  });
});
