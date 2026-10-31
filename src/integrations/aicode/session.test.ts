import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(), signUp: vi.fn(), getUser: vi.fn(), update: vi.fn(),
  getCookie: vi.fn(), getRequestHeader: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ handler: (fn: () => unknown) => fn }),
}));
vi.mock("@tanstack/react-start/server", () => mocks);
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { signInWithPassword: mocks.signIn, signUp: mocks.signUp, getUser: mocks.getUser },
    from: () => ({ update: () => ({ eq: mocks.update }) }),
  }),
}));
import { getAicodeSession } from "./session";

const session = { access_token: "access", refresh_token: "refresh", user: { id: "existing-id" } };
const failure = (code: string) => ({ data: { session: null }, error: { code } });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-key");
  vi.stubEnv("AICODE_GAME_SECRET", "test-secret");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, status: 200,
    json: async () => ({ msg: "Hello admin, role = ADMIN, fullName = Admin" }),
  }));
  mocks.getCookie.mockReturnValue("aicode-token");
  mocks.signIn.mockResolvedValue(failure("invalid_credentials"));
  mocks.signUp.mockResolvedValue({ data: { session }, error: null });
  mocks.update.mockResolvedValue({ error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("AICode email compatibility", () => {
  it("registers admin with a public domain when .local is rejected", async () => {
    mocks.signIn.mockResolvedValueOnce(failure("invalid_credentials"))
      .mockResolvedValueOnce(failure("email_address_invalid"));
    expect(await getAicodeSession()).toEqual({ status: "issued", accessToken: "access", refreshToken: "refresh" });
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: "admin@aicode.ptit.edu.vn" }));
  });

  it("reuses a legacy account without registering a duplicate", async () => {
    mocks.signIn.mockResolvedValueOnce(failure("invalid_credentials"))
      .mockResolvedValueOnce({ data: { session }, error: null });
    await getAicodeSession();
    expect(mocks.signIn).toHaveBeenLastCalledWith(expect.objectContaining({ email: "admin@aicode.local" }));
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith("id", "existing-id");
  });

  it("keeps an authenticated legacy session", async () => {
    mocks.getRequestHeader.mockReturnValue("Bearer old-access");
    mocks.getUser.mockResolvedValue({ data: { user: { email: "admin@aicode.local" } } });
    expect(await getAicodeSession()).toEqual({ status: "current" });
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("does not try legacy login when the new account signs in", async () => {
    mocks.signIn.mockResolvedValue({ data: { session }, error: null });
    await getAicodeSession();
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("does not create a duplicate on an unexpected legacy login error", async () => {
    mocks.signIn.mockResolvedValueOnce(failure("invalid_credentials"))
      .mockResolvedValueOnce(failure("over_request_rate_limit"));
    await expect(getAicodeSession()).rejects.toEqual({ code: "over_request_rate_limit" });
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
});
