import { afterAll, beforeAll, it } from "vitest";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";
import type { ViteDevServer } from "vite";
import { chromium } from "playwright-core";
import type { Browser, Page } from "playwright-core";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import type { InspectNode } from "../../src/index";
import { boxesTouching, changedRegions, inspectSnapshotSchema } from "./regions";
import type { ChangedRegion } from "./regions";

const ROOT = process.cwd();
const OUT = resolve(ROOT, ".visual");
const PREVIOUS = resolve(OUT, "previous");
const CURRENT = resolve(OUT, "current");
const DIFF = resolve(OUT, "diff");
const VIEWPORT = { width: 1400, height: 2200 };
const TABS = [
  { name: "demos", label: "Demos" },
  { name: "recipes", label: "CSS recipes" },
  { name: "playground", label: "Playground" },
];

let server: ViteDevServer;
let browser: Browser;
let page: Page;

beforeAll(async () => {
  server = await createServer({
    root: resolve(ROOT, "example"),
    configFile: resolve(ROOT, "example/vite.config.ts"),
    logLevel: "silent",
    server: { port: 0 },
  });
  await server.listen();
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  await context.route("http://localhost:4848/**", (route) => route.abort());
  await context.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
    window.cancelAnimationFrame = () => {};
  });
  page = await context.newPage();
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error("vite dev server reported no local URL");
  await page.goto(url, { waitUntil: "networkidle" });
  await page.keyboard.press("Control+Shift+D");
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

async function capture(label: string): Promise<{ png: Buffer; tree: InspectNode[] }> {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.mouse.move(VIEWPORT.width - 1, VIEWPORT.height - 1);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const png = await page.screenshot();
  const raw: unknown = await page.evaluate(() => {
    const snapshot: unknown = Reflect.get(window, "__boxflowTree");
    return typeof snapshot === "function" ? snapshot() : undefined;
  });
  return { png, tree: inspectSnapshotSchema.parse(raw).tree };
}

function describeRegion(region: ChangedRegion): string {
  const where = region.boxes.length > 0 ? region.boxes.join(", ") : "(no named box)";
  return `  x ${region.x}–${region.x + region.width - 1}, y ${region.y}–${region.y + region.height - 1} (${region.width}×${region.height}, ${region.pixels} px changed) in: ${where}`;
}

const previousTree = async (name: string): Promise<InspectNode[]> => {
  const path = resolve(PREVIOUS, `${name}.json`);
  if (!existsSync(path)) return [];
  return inspectSnapshotSchema.parse(JSON.parse(await readFile(path, "utf8"))).tree;
};

it("reports pixels that changed since the previous run", async () => {
  await rm(CURRENT, { recursive: true, force: true });
  await rm(DIFF, { recursive: true, force: true });
  await mkdir(CURRENT, { recursive: true });
  await mkdir(DIFF, { recursive: true });

  const report: string[] = [];
  for (const tab of TABS) {
    const { png, tree } = await capture(tab.label);
    await writeFile(resolve(CURRENT, `${tab.name}.png`), png);
    await writeFile(resolve(CURRENT, `${tab.name}.json`), JSON.stringify({ root: VIEWPORT, tree }));

    const previousPath = resolve(PREVIOUS, `${tab.name}.png`);
    if (!existsSync(previousPath)) {
      report.push(`${tab.name}: no previous run, baseline saved`);
      continue;
    }
    const before = PNG.sync.read(await readFile(previousPath));
    const after = PNG.sync.read(png);
    if (before.width !== after.width || before.height !== after.height) {
      report.push(
        `${tab.name}: size changed ${before.width}×${before.height} → ${after.width}×${after.height}`,
      );
      continue;
    }
    const { width, height } = after;
    const diff = new PNG({ width, height });
    const changed = pixelmatch(before.data, after.data, diff.data, width, height, {
      threshold: 0,
      includeAA: true,
    });
    if (changed === 0) {
      report.push(`${tab.name}: unchanged`);
      continue;
    }
    const diffPath = resolve(DIFF, `${tab.name}.png`);
    await writeFile(diffPath, PNG.sync.write(diff));
    const oldTree = await previousTree(tab.name);
    const regions = changedRegions(before.data, after.data, width, height).map((bounds) => ({
      ...bounds,
      boxes: [...new Set([...boxesTouching(bounds, tree), ...boxesTouching(bounds, oldTree)])],
    }));
    report.push(
      `${tab.name}: ${changed} px changed in ${regions.length} region(s), diff: ${diffPath}`,
    );
    report.push(...regions.map(describeRegion));
  }

  await rm(PREVIOUS, { recursive: true, force: true });
  await rename(CURRENT, PREVIOUS);
  const text = report.join("\n");
  await writeFile(resolve(OUT, "report.txt"), `${text}\n`);
  console.log(`\nVisual change report (also in ${resolve(OUT, "report.txt")}):\n${text}\n`);
});
