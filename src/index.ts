import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import {
  listCalls,
  getCallDetails,
  getCallTranscript,
  listUsers,
  getUsersByIds,
  getInteractionStats,
  getActivityScorecardsStats,
  getAggregateActivity,
  getDayByDayActivity,
  listCrmIntegrations,
  getDeals,
  listLibraryFolders,
  getLibraryFolderCalls,
  listTrackers,
  listWorkspaces,
} from "./gong.js";

// ── MCP Server factory ──

function createServer() {
  const server = new McpServer({
    name: "gong-readonly",
    version: "1.0.0",
  });

  // ═══ CALLS ═══

  server.tool(
    "gong_list_calls",
    "List Gong calls with optional date range and workspace filter. Returns call metadata (id, title, duration, parties, dates).",
    {
      fromDateTime: z.string().optional().describe("Start date/time in ISO 8601 (e.g. 2024-01-01T00:00:00Z)"),
      toDateTime: z.string().optional().describe("End date/time in ISO 8601"),
      workspaceId: z.string().optional().describe("Filter by workspace ID"),
      cursor: z.string().optional().describe("Pagination cursor from previous response"),
    },
    async (params) => {
      try {
        const result = await listCalls(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    "gong_get_call",
    "Get detailed information for one or more Gong calls by ID, including parties, structure, collaboration, and content.",
    {
      callIds: z.array(z.string()).describe("One or more Gong call IDs"),
    },
    async ({ callIds }) => {
      try {
        const result = await getCallDetails(callIds);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    "gong_get_transcript",
    "Get the full speaker-attributed transcript for a Gong call.",
    {
      callId: z.string().describe("The Gong call ID"),
    },
    async ({ callId }) => {
      try {
        const result = await getCallTranscript(callId);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ USERS ═══

  server.tool(
    "gong_list_users",
    "List all Gong users in the workspace. Returns user IDs, names, emails, and roles.",
    {
      cursor: z.string().optional().describe("Pagination cursor from previous response"),
    },
    async ({ cursor }) => {
      try {
        const result = await listUsers(cursor);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    "gong_get_users",
    "Get detailed profiles for specific Gong users by their IDs.",
    {
      userIds: z.array(z.string()).describe("One or more Gong user IDs"),
    },
    async ({ userIds }) => {
      try {
        const result = await getUsersByIds(userIds);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ STATS ═══

  server.tool(
    "gong_interaction_stats",
    "Get interaction statistics (talk ratio, patience, questions asked, longest monologue, etc.) for calls in a date range.",
    {
      fromDate: z.string().describe("Start date in YYYY-MM-DD format"),
      toDate: z.string().describe("End date in YYYY-MM-DD format"),
      userIds: z.array(z.string()).optional().describe("Filter by specific user IDs"),
    },
    async (params) => {
      try {
        const result = await getInteractionStats(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    "gong_scorecard_stats",
    "Get scorecard-based activity statistics for users in a date range.",
    {
      fromDate: z.string().describe("Start date in YYYY-MM-DD format"),
      toDate: z.string().describe("End date in YYYY-MM-DD format"),
      userIds: z.array(z.string()).optional().describe("Filter by specific user IDs"),
    },
    async (params) => {
      try {
        const result = await getActivityScorecardsStats(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    "gong_aggregate_activity",
    "Get aggregate activity metrics (total calls, emails, meetings) for users in a date range.",
    {
      fromDate: z.string().describe("Start date in YYYY-MM-DD format"),
      toDate: z.string().describe("End date in YYYY-MM-DD format"),
      userIds: z.array(z.string()).optional().describe("Filter by specific user IDs"),
    },
    async (params) => {
      try {
        const result = await getAggregateActivity(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    "gong_daily_activity",
    "Get day-by-day activity breakdown for users in a date range.",
    {
      fromDate: z.string().describe("Start date in YYYY-MM-DD format"),
      toDate: z.string().describe("End date in YYYY-MM-DD format"),
      userIds: z.array(z.string()).optional().describe("Filter by specific user IDs"),
    },
    async (params) => {
      try {
        const result = await getDayByDayActivity(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ DEALS / CRM ═══

  server.tool(
    "gong_list_deals",
    "List deals from Gong's CRM sync. Returns deal metadata, stages, and amounts.",
    {
      fromDateTime: z.string().optional().describe("Start date/time in ISO 8601"),
      toDateTime: z.string().optional().describe("End date/time in ISO 8601"),
      cursor: z.string().optional().describe("Pagination cursor"),
    },
    async (params) => {
      try {
        const result = await getDeals(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    "gong_crm_integrations",
    "List all CRM integrations configured in Gong.",
    {},
    async () => {
      try {
        const result = await listCrmIntegrations();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ LIBRARY ═══

  server.tool(
    "gong_list_library_folders",
    "List all public call library folders in Gong.",
    {},
    async () => {
      try {
        const result = await listLibraryFolders();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    "gong_get_library_folder_calls",
    "Get calls saved in a specific Gong library folder.",
    {
      folderId: z.string().describe("The library folder ID"),
    },
    async ({ folderId }) => {
      try {
        const result = await getLibraryFolderCalls(folderId);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ TRACKERS ═══

  server.tool(
    "gong_list_trackers",
    "List all keyword trackers configured in Gong (competitors, topics, objections, etc.).",
    {},
    async () => {
      try {
        const result = await listTrackers();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ WORKSPACES ═══

  server.tool(
    "gong_list_workspaces",
    "List all Gong workspaces available to this API key.",
    {},
    async () => {
      try {
        const result = await listWorkspaces();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  return server;
}

// ── HTTP Transport (for Claude custom connectors + Railway) ──

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

const transports: Record<string, StreamableHTTPServerTransport> = {};
const sseTransports: Record<string, SSEServerTransport> = {};

// ── CORS middleware ──
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Session-Id, mcp-session-id, Mcp-Protocol-Version, mcp-protocol-version");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "gong-readonly-mcp", version: "1.0.0" });
});

// ── Streamable HTTP Transport ──

app.post("/mcp", express.json(), async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && transports[sessionId]) {
      await transports[sessionId].handleRequest(req, res, req.body);
      return;
    }

    // Only create new transports for initialize requests (per MCP spec)
    const isInit = Array.isArray(req.body)
      ? req.body.some(isInitializeRequest)
      : isInitializeRequest(req.body);

    if (!isInit) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: No valid session ID provided" },
        id: null,
      });
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports[id] = transport;
      },
    });

    transport.onclose = () => {
      const sid = Object.keys(transports).find((k) => transports[k] === transport);
      if (sid) delete transports[sid];
    };

    const server = createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err: any) {
    console.error("[mcp] Error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: `Internal error: ${err.message}` },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && transports[sessionId]) {
      await transports[sessionId].handleRequest(req, res);
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "No valid session. Send POST to /mcp first." },
        id: null,
      });
    }
  } catch (err: any) {
    console.error("[mcp] Error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: `Internal error: ${err.message}` },
        id: null,
      });
    }
  }
});

app.delete("/mcp", async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && transports[sessionId]) {
      await transports[sessionId].handleRequest(req, res);
      delete transports[sessionId];
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "No valid session." },
        id: null,
      });
    }
  } catch (err: any) {
    console.error("[mcp] Error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: `Internal error: ${err.message}` },
        id: null,
      });
    }
  }
});

// ── Legacy SSE Transport ──

app.get("/sse", async (req: Request, res: Response) => {
  try {
    const transport = new SSEServerTransport("/messages", res);
    sseTransports[transport.sessionId] = transport;
    res.on("close", () => { delete sseTransports[transport.sessionId]; });
    const server = createServer();
    await server.connect(transport);
  } catch (err: any) {
    console.error("[sse] Error:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

app.post("/messages", express.json(), async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    const transport = sseTransports[sessionId];
    if (!transport) { res.status(404).json({ error: "Session not found" }); return; }
    await transport.handlePostMessage(req, res, req.body);
  } catch (err: any) {
    console.error("[messages] Error:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.error(`[server] Gong MCP server running on port ${PORT}`);
  console.error(`[server] Streamable HTTP: http://0.0.0.0:${PORT}/mcp`);
  console.error(`[server] Legacy SSE: http://0.0.0.0:${PORT}/sse`);
  console.error(`[server] Health check: http://0.0.0.0:${PORT}/health`);
});
