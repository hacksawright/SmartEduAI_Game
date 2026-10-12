// Gọi API của SmartEduAI: gắn token xác thực do trang chủ cung cấp (GamesConfig.authToken).

export type TokenGetter = () => string | Promise<string>;

/** Header kèm `Authorization: Bearer <token>` khi có authToken. */
export async function authHeaders(token?: TokenGetter, base: Record<string, string> = {}): Promise<Record<string, string>> {
  return token ? { ...base, Authorization: `Bearer ${await token()}` } : base;
}
