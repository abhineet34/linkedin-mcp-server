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

async function runStdio(): Promise<void> {
  if (!process.env.LINKEDIN_ACCESS_TOKEN) {
    console.error(
      "ERROR: LINKEDIN_ACCESS_TOKEN environment variable is required.\n" +
        "Obtain an OAuth 2.0 access token from the LinkedIn Developer Portal " +
        "and export it before starting the server."
    );
    process.exit(1);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LinkedIn MCP server running via stdio");
}

async function runHTTP(): Promise<void> {
  if (!process.env.LINKEDIN_ACCESS_TOKEN) {
    console.error(
      "ERROR: LINKEDIN_ACCESS_TOKEN environment variable is required."
    );
    process.exit(1);
  }

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
