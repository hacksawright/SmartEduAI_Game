// Đăng nhập game bằng tài khoản AICode (SSO).
//
// Game chạy cùng host với AICode (aicode.ptit.edu.vn/code/game), nên trình duyệt tự gửi kèm
// cookie HttpOnly "token" của AICode lên server game. Server dùng cookie đó hỏi backend-java
// (GET /profile) xem là ai, rồi cấp phiên Supabase cho user tương ứng:
// mỗi userId AICode ↔ đúng một user Supabase có email <userId>@aicode.local.
// Không dùng service role key: server đăng ký/đăng nhập user bằng publishable key với mật khẩu
// HMAC(AICODE_GAME_SECRET, userId) — chỉ server biết secret nên không ai đoán được mật khẩu.
// Supabase cần bật Email sign-ups và TẮT "Confirm email" để signUp trả về phiên ngay.
// Trình duyệt không bao giờ thấy secret, mật khẩu hay token AICode.
import { createHmac } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequestHeader } from "@tanstack/react-start/server";
import { createClient, type Session } from "@supabase/supabase-js";

const EMAIL_DOMAIN = "aicode.local";

export type AicodeSessionResult =
  // phiên Supabase trình duyệt đang giữ đã đúng user AICode — giữ nguyên
  | { status: "current" }
  | { status: "issued"; accessToken: string; refreshToken: string }
  // chưa đăng nhập AICode (hoặc token hết hạn) — trình duyệt chuyển sang loginUrl
  | { status: "unauthenticated"; loginUrl: string };

interface AicodeUser {
  userId: string;
  role: string;
  fullName: string;
}

function loginUrl(): string {
  return process.env.AICODE_LOGIN_URL || "/code/";
}

// /profile trả {"msg": "Hello <userId>, role = <role>, fullName = <họ tên>"} — định dạng cũ FE
// AICode đang parse (xem UserController.profile), nên ở đây parse theo đúng chuỗi đó.
const PROFILE_MSG = /^Hello (.+?), role = (.*?), fullName = (.*)$/s;

async function fetchAicodeUser(token: string): Promise<AicodeUser | null> {
  const base = process.env.AICODE_AUTH_INTERNAL_URL || "http://backend-java:8085";
  const res = await fetch(`${base.replace(/\/+$/, "")}/profile`, {
    headers: { Cookie: `token=${token}` },
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`AICode /profile trả về ${res.status}`);

  const body = (await res.json()) as { msg?: unknown };
  const match = typeof body.msg === "string" ? PROFILE_MSG.exec(body.msg) : null;
  if (!match) throw new Error("Không đọc được thông tin người dùng từ AICode /profile");
  return { userId: match[1], role: match[2], fullName: match[3].trim() };
}

function emailFor(userId: string): string {
  const local = userId.trim().toLowerCase();
  // userId AICode là mã SV/GV (chữ, số, . _ -) — chặn ký tự lạ để email luôn hợp lệ và không trùng
  if (!/^[a-z0-9._-]+$/.test(local)) throw new Error(`userId AICode không hợp lệ: ${userId}`);
  return `${local}@${EMAIL_DOMAIN}`;
}

function supabaseAnon() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_PUBLISHABLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function passwordFor(userId: string): string {
  const secret = process.env.AICODE_GAME_SECRET;
  if (!secret) throw new Error("Thiếu AICODE_GAME_SECRET");
  return createHmac("sha256", secret).update(`smartedu-game:${userId}`).digest("hex");
}

async function signInOrUp(email: string, aicode: AicodeUser): Promise<Session> {
  const anon = supabaseAnon();
  const password = passwordFor(aicode.userId);

  const signIn = await anon.auth.signInWithPassword({ email, password });
  if (signIn.data.session) return signIn.data.session;
  if (signIn.error && signIn.error.code !== "invalid_credentials") throw signIn.error;

  const { data, error } = await anon.auth.signUp({
    email,
    password,
    // trigger handle_new_user lấy full_name từ metadata để tạo profiles
    options: { data: { full_name: aicode.fullName || aicode.userId, aicode_user_id: aicode.userId } },
  });
  if (error) throw error;
  if (!data.session) {
    // email đã tồn tại với mật khẩu khác, hoặc Supabase đang bật "Confirm email"
    throw new Error(`Không tạo được phiên Supabase cho ${email}`);
  }
  return data.session;
}

async function issueSession(
  email: string,
  aicode: AicodeUser,
): Promise<{ accessToken: string; refreshToken: string }> {
  const session = await signInOrUp(email, aicode);

  // Họ tên và bỏ qua onboarding luôn theo AICode — game không hỏi lại tên.
  // Cập nhật bằng chính phiên của user (RLS "Users update own profile").
  const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
  const { error: profileError } = await userClient
    .from("profiles")
    .update({ full_name: aicode.fullName || aicode.userId, onboarding_completed: true })
    .eq("id", session.user.id);
  if (profileError) throw profileError;

  return { accessToken: session.access_token, refreshToken: session.refresh_token };
}

async function currentSessionEmail(): Promise<string | null> {
  // attachSupabaseAuth (src/start.ts) gắn access token Supabase hiện tại vào mọi lời gọi serverFn
  const bearer = getRequestHeader("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return null;
  const { data } = await supabaseAnon().auth.getUser(bearer);
  return data.user?.email ?? null;
}

export const getAicodeSession = createServerFn({ method: "POST" }).handler(
  async (): Promise<AicodeSessionResult> => {
    const token = getCookie("token");
    const aicode = token ? await fetchAicodeUser(token) : null;
    if (!aicode) return { status: "unauthenticated", loginUrl: loginUrl() };

    const email = emailFor(aicode.userId);
    if ((await currentSessionEmail()) === email) return { status: "current" };

    return { status: "issued", ...(await issueSession(email, aicode)) };
  },
);
