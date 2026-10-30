// Đăng nhập game bằng tài khoản AICode (SSO).
//
// Game chạy cùng host với AICode (aicode.ptit.edu.vn/code/game), nên trình duyệt tự gửi kèm
// cookie HttpOnly "token" của AICode lên server game. Server dùng cookie đó hỏi backend-java
// (GET /profile) xem là ai, rồi cấp phiên Supabase cho user tương ứng:
// mỗi userId AICode ↔ đúng một user Supabase có email <userId>@aicode.local.
// Trình duyệt không bao giờ thấy service role key hay token AICode.
import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

async function ensureSupabaseUser(email: string, aicode: AicodeUser): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    // trigger handle_new_user lấy full_name từ metadata để tạo profiles
    user_metadata: { full_name: aicode.fullName || aicode.userId, aicode_user_id: aicode.userId },
  });
  if (error && error.code !== "email_exists") throw error;
}

async function issueSession(
  email: string,
  fullName: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  // Magic link chỉ sinh ở server và đổi ngay thành phiên — không gửi email nào.
  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError) throw linkError;

  const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (error || !data.session) throw error ?? new Error("Supabase không trả về phiên đăng nhập");

  // Họ tên và bỏ qua onboarding luôn theo AICode — game không hỏi lại tên.
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ full_name: fullName, onboarding_completed: true })
    .eq("id", data.session.user.id);
  if (profileError) throw profileError;

  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
}

async function currentSessionEmail(): Promise<string | null> {
  // attachSupabaseAuth (src/start.ts) gắn access token Supabase hiện tại vào mọi lời gọi serverFn
  const bearer = getRequestHeader("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return null;
  const { data } = await supabaseAdmin.auth.getUser(bearer);
  return data.user?.email ?? null;
}

export const getAicodeSession = createServerFn({ method: "POST" }).handler(
  async (): Promise<AicodeSessionResult> => {
    const token = getCookie("token");
    const aicode = token ? await fetchAicodeUser(token) : null;
    if (!aicode) return { status: "unauthenticated", loginUrl: loginUrl() };

    const email = emailFor(aicode.userId);
    if ((await currentSessionEmail()) === email) return { status: "current" };

    await ensureSupabaseUser(email, aicode);
    return { status: "issued", ...(await issueSession(email, aicode.fullName || aicode.userId)) };
  },
);
