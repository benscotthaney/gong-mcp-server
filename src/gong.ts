/**
 * Gong API v2 — read-only client
 * Auth: Basic (Access Key + Access Key Secret)
 * Base URL comes from GONG_BASE_URL env var (e.g. https://us-48909.api.gong.io)
 */

const GONG_BASE_URL = (process.env.GONG_BASE_URL || "https://api.gong.io").replace(/\/$/, "");
const GONG_ACCESS_KEY = process.env.GONG_ACCESS_KEY || "";
const GONG_ACCESS_KEY_SECRET = process.env.GONG_ACCESS_KEY_SECRET || "";

function getAuthHeader(): string {
  const credentials = Buffer.from(`${GONG_ACCESS_KEY}:${GONG_ACCESS_KEY_SECRET}`).toString("base64");
  return `Basic ${credentials}`;
}

async function gongFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${GONG_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gong API ${res.status}: ${body}`);
  }

  return res.json();
}

async function gongGet(path: string): Promise<any> {
  return gongFetch(path, { method: "GET" });
}

async function gongPost(path: string, body: any = {}): Promise<any> {
  return gongFetch(path, { method: "POST", body: JSON.stringify(body) });
}

// ── Helper to collect all pages ──

async function gongPostPaginated(path: string, body: any = {}, pageKey = "records"): Promise<any[]> {
  const allRecords: any[] = [];
  let cursor: string | undefined;

  do {
    const payload = cursor ? { ...body, cursor } : body;
    const data = await gongPost(path, payload);
    const records = data[pageKey] || data.calls || data.users || [];
    allRecords.push(...records);
    cursor = data.records?.cursor || data.cursor;
    // Safety: stop after 10 pages to avoid runaway
    if (allRecords.length > 5000) break;
  } while (cursor);

  return allRecords;
}

// ═══════════════════════════════════════
// CALLS
// ═══════════════════════════════════════

export interface ListCallsParams {
  fromDateTime?: string; // ISO 8601
  toDateTime?: string;
  workspaceId?: string;
  cursor?: string;
}

export async function listCalls(params: ListCallsParams = {}): Promise<any> {
  const body: any = {};
  if (params.fromDateTime) body.filter = { ...body.filter, fromDateTime: params.fromDateTime };
  if (params.toDateTime) body.filter = { ...body.filter, toDateTime: params.toDateTime };
  if (params.workspaceId) body.filter = { ...body.filter, workspaceId: params.workspaceId };
  if (params.cursor) body.cursor = params.cursor;
  return gongPost("/v2/calls", body);
}

export async function getCallDetails(callIds: string[]): Promise<any> {
  return gongPost("/v2/calls/extensive", {
    filter: { callIds },
    contentSelector: {
      exposedFields: {
        content: true,
        collaboration: true,
        media: true,
        parties: true,
        structure: true,
      },
    },
  });
}

export async function getCallTranscript(callId: string): Promise<any> {
  return gongPost("/v2/calls/transcript", {
    filter: { callIds: [callId] },
  });
}

// ═══════════════════════════════════════
// USERS
// ═══════════════════════════════════════

export async function listUsers(cursor?: string): Promise<any> {
  const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return gongGet(`/v2/users${params}`);
}

export async function getUsersByIds(userIds: string[]): Promise<any> {
  return gongPost("/v2/users/extensive", {
    filter: { userIds },
  });
}

// ═══════════════════════════════════════
// STATS
// ═══════════════════════════════════════

export interface StatsParams {
  fromDateTime: string;
  toDateTime: string;
  userIds?: string[];
}

export async function getInteractionStats(params: StatsParams): Promise<any> {
  const body: any = {
    filter: {
      fromDateTime: params.fromDateTime,
      toDateTime: params.toDateTime,
    },
  };
  if (params.userIds?.length) body.filter.userIds = params.userIds;
  return gongPost("/v2/stats/interaction", body);
}

export async function getActivityScorecardsStats(params: StatsParams): Promise<any> {
  const body: any = {
    filter: {
      fromDateTime: params.fromDateTime,
      toDateTime: params.toDateTime,
    },
  };
  if (params.userIds?.length) body.filter.userIds = params.userIds;
  return gongPost("/v2/stats/activity/scorecards", body);
}

export async function getAggregateActivity(params: StatsParams): Promise<any> {
  const body: any = {
    filter: {
      fromDateTime: params.fromDateTime,
      toDateTime: params.toDateTime,
    },
  };
  if (params.userIds?.length) body.filter.userIds = params.userIds;
  return gongPost("/v2/stats/activity/aggregate", body);
}

export async function getDayByDayActivity(params: StatsParams): Promise<any> {
  const body: any = {
    filter: {
      fromDateTime: params.fromDateTime,
      toDateTime: params.toDateTime,
    },
  };
  if (params.userIds?.length) body.filter.userIds = params.userIds;
  return gongPost("/v2/stats/activity/day-by-day", body);
}

// ═══════════════════════════════════════
// CRM / DEALS
// ═══════════════════════════════════════

export async function listCrmIntegrations(): Promise<any> {
  return gongGet("/v2/crm/integrations");
}

export async function getDeals(params: { fromDateTime?: string; toDateTime?: string; cursor?: string } = {}): Promise<any> {
  const body: any = {};
  if (params.fromDateTime || params.toDateTime) {
    body.filter = {};
    if (params.fromDateTime) body.filter.fromDateTime = params.fromDateTime;
    if (params.toDateTime) body.filter.toDateTime = params.toDateTime;
  }
  if (params.cursor) body.cursor = params.cursor;
  return gongPost("/v2/deals", body);
}

// ═══════════════════════════════════════
// LIBRARY
// ═══════════════════════════════════════

export async function listLibraryFolders(): Promise<any> {
  return gongGet("/v2/library/folders");
}

export async function getLibraryFolderCalls(folderId: string): Promise<any> {
  return gongGet(`/v2/library/folder-content?folderId=${encodeURIComponent(folderId)}`);
}

// ═══════════════════════════════════════
// TRACKERS (keyword trackers)
// ═══════════════════════════════════════

export async function listTrackers(): Promise<any> {
  return gongGet("/v2/settings/trackers");
}

// ═══════════════════════════════════════
// WORKSPACES
// ═══════════════════════════════════════

export async function listWorkspaces(): Promise<any> {
  return gongGet("/v2/workspaces");
}
