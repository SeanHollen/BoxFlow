import type { Vec2 } from "./types";

export interface InspectNode {
  kind: string;
  name?: string;
  rect: { left: number; top: number; width: number; height: number };
  corners: { topLeft: Vec2; topRight: Vec2; bottomRight: Vec2; bottomLeft: Vec2 };
  children: InspectNode[];
}

export interface InspectSnapshot {
  capturedAt: string;
  root: { width: number; height: number };
  tree: InspectNode[];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildLayoutTree(root: HTMLElement): InspectNode[] {
  const origin = root.getBoundingClientRect();
  const originLeft = origin.left - root.scrollLeft;
  const originTop = origin.top - root.scrollTop;

  const collect = (el: Element): InspectNode[] => {
    const nodes: InspectNode[] = [];
    for (const child of el.children) {
      if (!(child instanceof HTMLElement)) continue;
      const kind = child.dataset["bcKind"];
      if (kind === undefined) {
        nodes.push(...collect(child));
        continue;
      }
      const r = child.getBoundingClientRect();
      const left = round(r.left - originLeft);
      const top = round(r.top - originTop);
      const width = round(r.width);
      const height = round(r.height);
      const node: InspectNode = {
        kind,
        rect: { left, top, width, height },
        corners: {
          topLeft: { x: left, y: top },
          topRight: { x: round(left + width), y: top },
          bottomRight: { x: round(left + width), y: round(top + height) },
          bottomLeft: { x: left, y: round(top + height) },
        },
        children: collect(child),
      };
      const name = child.dataset["bcName"];
      if (name !== undefined) node.name = name;
      nodes.push(node);
    }
    return nodes;
  };

  return collect(root);
}

export function buildLayoutSnapshot(root: HTMLElement): InspectSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    root: { width: round(root.clientWidth), height: round(root.clientHeight) },
    tree: buildLayoutTree(root),
  };
}
