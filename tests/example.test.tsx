import { beforeAll, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { BoxRoot } from "../src/index";
import { Recipes } from "../example/Recipes";

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
    get: () => 1400,
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 900,
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get: () => 100,
  });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => 15,
  });
});

describe("Recipes page", () => {
  it("recipe cards grow to include their demo areas under StrictMode", () => {
    render(
      <StrictMode>
        <BoxRoot size={{ min: { x: 1160 } }}>
          <Recipes />
        </BoxRoot>
      </StrictMode>,
    );
    const navbarBar = screen.getByText("Brand").parentElement as HTMLElement;
    const demoBox = navbarBar.parentElement as HTMLElement;
    const card = demoBox.parentElement as HTMLElement;
    expect(Number.parseFloat(demoBox.style.height)).toBe(44);
    expect(Number.parseFloat(card.style.height)).toBeGreaterThan(
      Number.parseFloat(demoBox.style.top) + 44,
    );
  });

  it("hover & click recipe reacts to pointer events on boxes and shapes", () => {
    const view = render(
      <StrictMode>
        <BoxRoot size={{ min: { x: 1160 } }}>
          <Recipes />
        </BoxRoot>
      </StrictMode>,
    );
    const chip = document.querySelector('[data-bc-name="hover-chip-0"]') as HTMLDivElement;
    const before = chip.style.backgroundColor;
    fireEvent.pointerEnter(chip);
    expect(chip.style.backgroundColor).not.toBe(before);
    fireEvent.pointerLeave(chip);
    expect(chip.style.backgroundColor).toBe(before);

    const ellipse = document.querySelector(
      '[data-bc-name="hover-ellipse"] ellipse',
    ) as SVGEllipseElement;
    const ellipseFill = ellipse.getAttribute("fill");
    fireEvent.pointerEnter(ellipse);
    expect(ellipse.getAttribute("fill")).not.toBe(ellipseFill);

    const polygon = document.querySelector(
      '[data-bc-name="hover-polygon"] polygon',
    ) as SVGPolygonElement;
    fireEvent.click(polygon);
    fireEvent.click(polygon);
    expect(view.container.textContent).toContain("2 clicks");
  });
});
