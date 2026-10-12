// Mock API point transaction (TV1) cho môi trường dev. Hợp đồng API: docs/INTEGRATION.md.
// Server chấm lại bài làm bằng verifySubmission() trước khi cộng điểm, rồi chống cộng trùng
// bằng idempotency_key = user_id:game_id:level_id:stars (mục 6 kế hoạch).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { creditFor, type LearningEvent } from "../src/core/events";
import { verifySubmission } from "../src/core/verify";

interface Db {
  keys: string[];
  users: Record<string, { points: number; levels: Record<string, { best_stars: number; best_score: number }> }>;
  analytics: number;
}

const DB_FILE = resolve(process.cwd(), ".mock-data/db.json");

function load(): Db {
  try {
    if (existsSync(DB_FILE)) return JSON.parse(readFileSync(DB_FILE, "utf8")) as Db;
  } catch {
    /* tệp hỏng: tạo lại */
  }
  return { keys: [], users: {}, analytics: 0 };
}

function save(db: Db) {
  mkdirSync(dirname(DB_FILE), { recursive: true });
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((ok, bad) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        ok(data ? JSON.parse(data) : {});
      } catch (e) {
        bad(e);
      }
    });
    req.on("error", bad);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export async function handle(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? "/", "http://local");

  if (req.method === "POST" && url.pathname === "/learning-events") {
    const ev = (await readBody(req)) as LearningEvent;
    // đọc – sửa – ghi liền mạch, không có await xen giữa: các request song song (e2e) không ghi đè nhau
    const db = load();
    if (ev?.event !== "game_level_completed" || !ev.user_id || !ev.level_id || !ev.submission) {
      return send(res, 400, { status: "rejected", reason: "Thiếu trường bắt buộc." });
    }
    const v = verifySubmission(ev.level_id, ev.submission);
    if (!v.ok) return send(res, 422, { status: "rejected", reason: v.reason });

    // dùng số sao do server tính, không tin số sao client gửi lên
    const key = `${ev.user_id}:${ev.game_id}:${ev.level_id}:${v.stars}`;
    const user = (db.users[ev.user_id] ??= { points: 0, levels: {} });
    const rec = (user.levels[ev.level_id] ??= { best_stars: 0, best_score: 0 });
    rec.best_score = Math.max(rec.best_score, v.score);
    if (db.keys.includes(key)) {
      save(db);
      return send(res, 200, { status: "duplicate", credited: 0, points_total: user.points, stars: v.stars, score: v.score, best_stars: rec.best_stars, idempotency_key: key });
    }
    db.keys.push(key);
    const credited = creditFor(rec.best_stars, v.stars);
    if (credited > 0) {
      rec.best_stars = v.stars;
      user.points += credited;
    }
    save(db);
    return send(res, 200, {
      status: credited > 0 ? "credited" : "no_improvement",
      credited,
      points_total: user.points,
      stars: v.stars,
      score: v.score,
      best_stars: rec.best_stars,
      adjusted: ev.stars !== v.stars,
      idempotency_key: key,
    });
  }

  if (req.method === "GET" && url.pathname === "/progress") {
    const user = load().users[url.searchParams.get("user_id") ?? ""];
    return send(res, 200, { points_total: user?.points ?? 0, levels: user?.levels ?? {} });
  }

  if (req.method === "POST" && url.pathname === "/analytics") {
    await readBody(req);
    const db = load();
    db.analytics++;
    save(db);
    return send(res, 202, { ok: true });
  }

  next();
}
