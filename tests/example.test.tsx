import { beforeAll, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
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
});
