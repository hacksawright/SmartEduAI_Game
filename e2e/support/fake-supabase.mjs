// Supabase giả cho test e2e và chạy thử trên máy (không cần project Supabase thật).
//
//   node e2e/support/fake-supabase.mjs          # cổng 54329, hoặc FAKE_SUPABASE_PORT
//
// Chỉ làm đủ phần app dùng: đăng nhập ẩn danh (GoTrue) và PostgREST cơ bản (select có embed
// đơn giản, eq/neq/gt/gte/lt/lte/in/is/not, order, limit, insert/upsert/update/delete,
// single/maybeSingle, count). Dữ liệu nằm trong bộ nhớ.
//
// API cho test (không có trong Supabase thật):
//   POST /__test/reset    { profileDefaults?, seed?: { bảng: dòng[] }, failTables?: string[] }
//   POST /__test/seed     { bảng: dòng[] }
//   GET  /__test/db       toàn bộ dữ liệu
//   GET  /__test/requests nhật ký các request REST/Auth kể từ lần reset gần nhất
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.FAKE_SUPABASE_PORT ?? 54329);

let tables = {};
let users = new Map(); // id -> user
let refreshTokens = new Map(); // refresh token -> user id
let profileDefaults = {};
let failTables = new Set();
let requestLog = [];

// Quan hệ dùng cho select có embed, ví dụ profiles!social_feed_events_student_id_fkey(full_name)
const EMBEDS = {
  social_feed_events: {
    profiles: { table: "profiles", local: "student_id", foreign: "id", one: true },
  },
  lessons: { chapters: { table: "chapters", local: "chapter_id", foreign: "id", one: true } },
  lesson_pages: { questions: { table: "questions", local: "id", foreign: "page_id", one: false } },
};

function reset(body = {}) {
  tables = {};
  users = new Map();
  refreshTokens = new Map();
  requestLog = [];
  profileDefaults = body.profileDefaults ?? {};
  failTables = new Set(body.failTables ?? []);
  if (body.seed) seed(body.seed);
}

function seed(data) {
  for (const [table, rows] of Object.entries(data)) {
    tables[table] ??= [];
    for (const row of rows) tables[table].push(withDefaults(table, row));
  }
}

function withDefaults(table, row) {
  const now = new Date().toISOString();
  const out = { ...row };
  if (table !== "profiles" && out.id === undefined) out.id = randomUUID();
  out.created_at ??= now;
  if (table === "profiles") out.updated_at ??= now;
  return out;
}

// ---------- Auth (GoTrue) ----------

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

function sessionFor(user) {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 3600;
  const accessToken = [
    b64url({ alg: "HS256", typ: "JWT" }),
    b64url({
      sub: user.id,
      aud: "authenticated",
      role: "authenticated",
      is_anonymous: true,
      iat: now,
      exp: now + expiresIn,
      session_id: randomUUID(),
    }),
    "fake-signature",
  ].join(".");
  const refreshToken = randomUUID();
  refreshTokens.set(refreshToken, user.id);
  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: now + expiresIn,
    refresh_token: refreshToken,
    user,
  };
}

function userFromRequest(req) {
  const auth = req.headers.authorization ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const { sub } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return users.get(sub) ?? null;
  } catch {
    return null;
  }
}

function createAnonymousUser() {
  const now = new Date().toISOString();
  const user = {
    id: randomUUID(),
    aud: "authenticated",
    role: "authenticated",
    email: "",
    phone: "",
    is_anonymous: true,
    app_metadata: { provider: "anonymous", providers: ["anonymous"] },
    user_metadata: {},
    identities: [],
    created_at: now,
    updated_at: now,
  };
  users.set(user.id, user);
  tables.profiles ??= [];
  tables.profiles.push(
    withDefaults("profiles", {
      id: user.id,
      full_name: null,
      email: null,
      avatar_url: null,
      school: null,
      grade: null,
      math_nickname: null,
      math_level: null,
      learning_goal: null,
      daily_goal_minutes: null,
      xp_total: 0,
      level: 1,
      streak_current: 0,
      streak_longest: 0,
      streak_freezes: 0,
      last_active_date: null,
      onboarding_completed: false,
      show_in_feed: true,
      ...profileDefaults,
    }),
  );
  return user;
}

function handleAuth(req, res, url, body) {
  const path = url.pathname.replace(/^\/auth\/v1/, "");
  if (req.method === "POST" && path === "/signup") {
    return json(res, 200, sessionFor(createAnonymousUser()));
  }
  if (req.method === "POST" && path === "/token") {
    const userId = refreshTokens.get(body?.refresh_token);
    const user = userId && users.get(userId);
    if (!user)
      return json(res, 400, { error: "invalid_grant", error_description: "Invalid Refresh Token" });
    return json(res, 200, sessionFor(user));
  }
  if (req.method === "GET" && path === "/user") {
    const user = userFromRequest(req);
    return user ? json(res, 200, user) : json(res, 401, { message: "invalid JWT" });
  }
  if (req.method === "POST" && path === "/logout") return send(res, 204);
  if (req.method === "GET" && path === "/settings") return json(res, 200, { external: {} });
  return json(res, 404, { message: `fake-supabase: ${req.method} ${path} chưa hỗ trợ` });
}

// ---------- PostgREST ----------

function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseSelect(select) {
  return splitTopLevel(select ?? "*").map((item) => {
    const embed = item.match(/^(?:(\w+):)?(\w+)(?:!\w+)?\((.*)\)$/s);
    if (embed) return { embed: embed[2], alias: embed[1] ?? embed[2], select: embed[3] };
    const [alias, column] = item.includes(":") ? item.split(":") : [item, item];
    return { column: column.trim(), alias: alias.trim() };
  });
}

function project(table, row, select) {
  const fields = parseSelect(select);
  const out = {};
  for (const field of fields) {
    if (field.embed) {
      const rel = EMBEDS[table]?.[field.embed];
      if (!rel) {
        out[field.alias] = null;
        continue;
      }
      const related = (tables[rel.table] ?? []).filter((r) => r[rel.foreign] === row[rel.local]);
      const projected = related.map((r) => project(rel.table, r, field.select));
      out[field.alias] = rel.one ? (projected[0] ?? null) : projected;
    } else if (field.column === "*") Object.assign(out, row);
    else out[field.alias] = row[field.column] ?? null;
  }
  return out;
}

function coerce(raw, sample) {
  if (raw === "null") return null;
  if (typeof sample === "number") return Number(raw);
  if (typeof sample === "boolean") return raw === "true";
  return raw;
}

function matches(row, column, expression) {
  let negate = false;
  let expr = expression;
  if (expr.startsWith("not.")) {
    negate = true;
    expr = expr.slice(4);
  }
  const dot = expr.indexOf(".");
  const op = expr.slice(0, dot);
  const raw = expr.slice(dot + 1);
  const value = row[column];
  let ok;
  switch (op) {
    case "eq":
      ok = value === coerce(raw, value) || String(value) === raw;
      break;
    case "neq":
      ok = !(value === coerce(raw, value) || String(value) === raw);
      break;
    case "gt":
      ok = value > coerce(raw, value);
      break;
    case "gte":
      ok = value >= coerce(raw, value);
      break;
    case "lt":
      ok = value < coerce(raw, value);
      break;
    case "lte":
      ok = value <= coerce(raw, value);
      break;
    case "in": {
      const list = raw
        .replace(/^\(|\)$/g, "")
        .split(",")
        .map((v) => v.replace(/^"|"$/g, ""));
      ok = list.includes(String(value));
      break;
    }
    case "is":
      ok = raw === "null" ? value === null || value === undefined : value === (raw === "true");
      break;
    default:
      throw new Error(`fake-supabase: toán tử ${op} chưa hỗ trợ`);
  }
  return negate ? !ok : ok;
}

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function filterRows(rows, params) {
  let out = rows;
  for (const [key, value] of params) {
    if (RESERVED.has(key)) continue;
    out = out.filter((row) => matches(row, key, value));
  }
  return out;
}

function orderRows(rows, order) {
  if (!order) return rows;
  const keys = order.split(",").map((part) => {
    const [column, dir = "asc"] = part.split(".");
    return { column, desc: dir === "desc" };
  });
  return [...rows].sort((a, b) => {
    for (const { column, desc } of keys) {
      if (a[column] === b[column]) continue;
      const cmp = a[column] > b[column] ? 1 : -1;
      return desc ? -cmp : cmp;
    }
    return 0;
  });
}

function handleRest(req, res, url, body) {
  const table = url.pathname.replace(/^\/rest\/v1\//, "");
  if (failTables.has(table)) {
    return json(res, 404, {
      code: "PGRST205",
      message: `Could not find the table 'public.${table}' in the schema cache`,
      details: null,
      hint: null,
    });
  }
  tables[table] ??= [];
  const params = [...url.searchParams.entries()];
  const prefer = req.headers.prefer ?? "";
  const wantsObject = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  const representation = prefer.includes("return=representation");
  const select = url.searchParams.get("select") ?? "*";

  const respondRows = (status, rows, total) => {
    const headers = {};
    if (prefer.includes("count=")) {
      headers["Content-Range"] = rows.length ? `0-${rows.length - 1}/${total}` : `*/${total}`;
    }
    if (req.method === "HEAD") return send(res, status, null, headers);
    const projected = rows.map((row) => project(table, row, select));
    if (wantsObject) {
      if (projected.length !== 1) {
        return json(res, 406, {
          code: "PGRST116",
          message: "JSON object requested, multiple (or no) rows returned",
          details: `The result contains ${projected.length} rows`,
          hint: null,
        });
      }
      return json(res, status, projected[0], headers);
    }
    return json(res, status, projected, headers);
  };

  if (req.method === "GET" || req.method === "HEAD") {
    let rows = orderRows(filterRows(tables[table], params), url.searchParams.get("order"));
    const total = rows.length;
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = url.searchParams.get("limit");
    rows = rows.slice(offset, limit ? offset + Number(limit) : undefined);
    return respondRows(200, rows, total);
  }

  if (req.method === "POST") {
    const incoming = Array.isArray(body) ? body : [body];
    const upsert = prefer.includes("resolution=merge-duplicates");
    const ignore = prefer.includes("resolution=ignore-duplicates");
    const conflict = (url.searchParams.get("on_conflict") ?? "id").split(",");
    const written = [];
    for (const raw of incoming) {
      const existing =
        upsert || ignore
          ? tables[table].find((row) =>
              conflict.every((c) => raw[c] !== undefined && row[c] === raw[c]),
            )
          : undefined;
      if (existing) {
        if (upsert) Object.assign(existing, raw);
        written.push(existing);
      } else {
        const row = withDefaults(table, raw);
        tables[table].push(row);
        written.push(row);
      }
    }
    if (!representation) return send(res, 201);
    return respondRows(201, written, written.length);
  }

  if (req.method === "PATCH") {
    const rows = filterRows(tables[table], params);
    for (const row of rows) {
      Object.assign(row, body);
      if (table === "profiles") row.updated_at = new Date().toISOString();
    }
    if (!representation) return send(res, 204);
    return respondRows(200, rows, rows.length);
  }

  if (req.method === "DELETE") {
    const rows = filterRows(tables[table], params);
    tables[table] = tables[table].filter((row) => !rows.includes(row));
    if (!representation) return send(res, 204);
    return respondRows(200, rows, rows.length);
  }

  return json(res, 405, { message: `fake-supabase: ${req.method} chưa hỗ trợ` });
}

// ---------- HTTP ----------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Expose-Headers": "Content-Range, Content-Location",
};

function send(res, status, payload = null, headers = {}) {
  res.writeHead(status, { ...CORS, ...headers });
  res.end(payload ?? undefined);
}

function json(res, status, value, headers = {}) {
  send(res, status, JSON.stringify(value), { "Content-Type": "application/json", ...headers });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204);
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const body = await readBody(req);
  try {
    if (url.pathname.startsWith("/__test/")) {
      const action = url.pathname.slice("/__test/".length);
      if (action === "reset" && req.method === "POST") {
        reset(body);
        return json(res, 200, { ok: true });
      }
      if (action === "seed" && req.method === "POST") {
        seed(body ?? {});
        return json(res, 200, { ok: true });
      }
      if (action === "db") return json(res, 200, tables);
      if (action === "requests") return json(res, 200, requestLog);
      if (action === "health") return json(res, 200, { ok: true });
      return json(res, 404, { message: "unknown test endpoint" });
    }
    requestLog.push({ method: req.method, path: url.pathname, query: url.search, at: Date.now() });
    if (url.pathname.startsWith("/auth/v1/")) return handleAuth(req, res, url, body);
    if (url.pathname.startsWith("/rest/v1/")) return handleRest(req, res, url, body);
    return json(res, 404, { message: `fake-supabase: ${url.pathname} chưa hỗ trợ` });
  } catch (error) {
    console.error(error);
    return json(res, 500, { message: String(error) });
  }
});

reset();
server.listen(PORT, "127.0.0.1", () => {
  console.log(`fake-supabase đang chạy ở http://127.0.0.1:${PORT}`);
});
