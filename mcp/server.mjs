import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const PORT = Number(process.env.BC_INSPECT_PORT ?? 4848);

let latest;

const httpServer = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") {
    res.end();
    return;
  }
  if (req.method === "GET" && req.url === "/layout") {
    res.setHeader("content-type", "application/json");
    res.end(latest ? JSON.stringify(latest, undefined, 2) : "null");
    return;
  }
  if (req.method === "POST" && req.url === "/layout") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        latest = JSON.parse(body);
        res.end("ok");
      } catch {
        res.statusCode = 400;
        res.end("bad json");
      }
    });
    return;
  }
  res.statusCode = 404;
  res.end();
});
httpServer.listen(PORT);

const NO_SNAPSHOT =
  "No layout snapshot received yet. Is the app running with <BoxRoot inspect> and posting to " +
  `http://localhost:${PORT}/layout?`;

function findNodes(nodes, name, out) {
  for (const node of nodes) {
    if (node.name !== undefined && node.name.includes(name)) out.push(node);
    findNodes(node.children, name, out);
  }
  return out;
}

const server = new McpServer({ name: "boxflow-layout", version: "0.1.0" });

server.tool(
  "layout_tree",
  "Latest layout snapshot of the running BoxFlow app: a JSON tree of every Box/Text with the exact corner coordinates of each rectangle, relative to the BoxRoot origin. Ground truth read from the DOM.",
  {},
  async () => ({
    content: [
      { type: "text", text: latest ? JSON.stringify(latest, undefined, 2) : NO_SNAPSHOT },
    ],
  }),
);

server.tool(
  "find_box",
  "Find boxes by name (substring match against the `name` prop) in the latest layout snapshot; returns each match's subtree with corner coordinates.",
  { name: z.string() },
  async ({ name }) => {
    if (!latest) return { content: [{ type: "text", text: NO_SNAPSHOT }] };
    const matches = findNodes(latest.tree ?? [], name, []);
    const text =
      matches.length > 0
        ? JSON.stringify({ capturedAt: latest.capturedAt, matches }, undefined, 2)
        : `No box with a name containing "${name}". Names come from the \`name\` prop.`;
    return { content: [{ type: "text", text }] };
  },
);

await server.connect(new StdioServerTransport());
