#!/usr/bin/env node
/**
 * LinkedIn MCP Server
 *
 * Provides tools for interacting with the LinkedIn REST API, including:
 * - Profile retrieval (OIDC userinfo)
 * - Post creation, retrieval, update, and deletion
 * - Image asset upload
 * - Organization page lookup and follower counts
 *
 * Authentication: set LINKEDIN_ACCESS_TOKEN environment variable.
 * Transport: stdio (default) or streamable HTTP (TRANSPORT=http).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";

import { registerProfileTools } from "./tools/profile.js";
import { registerPostTools } from "./tools/posts.js";
import { registerMediaTools } from "./tools/media.js";
import { registerOrganizationTools } from "./tools/organizations.js";

const server = new McpServer({
  name: "linkedin-mcp-server",
  version: "1.0.0",
});

registerProfileTools(server);
registerPostTools(server);
registerMediaTools(server);
registerOrganizationTools(server);

function warnIfTokenMissing(): void {
  // We don't fail-fast on a missing token because MCP introspection (listing
  // tools/resources) should work without one — directories like Glama spin
  // the server up in a sandbox to verify it responds to tools/list. The token
  // is enforced lazily at the point any tool actually calls the LinkedIn API.
  if (!process.env.LINKEDIN_ACCESS_TOKEN) {
    console.error(
      "[linkedin-mcp-server] LINKEDIN_ACCESS_TOKEN is not set. " +
        "The server will start and respond to introspection, but every tool " +
        "call will return an auth error until you set the token. " +
        "Obtain one from the LinkedIn Developer Portal: " +
        "https://www.linkedin.com/developers/tools/oauth/token-generator"
    );
  }
}

async function runStdio(): Promise<void> {
  warnIfTokenMissing();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LinkedIn MCP server running via stdio");
}

async function runHTTP(): Promise<void> {
  warnIfTokenMissing();

  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: "linkedin-mcp-server", version: "1.0.0" });
  });

  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => {
    console.error(`LinkedIn MCP server running on http://localhost:${port}/mcp`);
  });
}

const transport = process.env.TRANSPORT ?? "stdio";
if (transport === "http") {
  runHTTP().catch((error: unknown) => {
    console.error("Server error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error: unknown) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
