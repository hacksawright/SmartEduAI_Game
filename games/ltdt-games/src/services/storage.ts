// localStorage an toàn: chế độ riêng tư hoặc bị chặn cookie thì dùng bộ nhớ tạm.

const memory = new Map<string, string>();

function ls(): Storage | null {
  try {
    const s = globalThis.localStorage;
    const k = "__lg_probe__";
    s.setItem(k, "1");
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

const store = ls();

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = store ? store.getItem(key) : (memory.get(key) ?? null);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  try {
    if (store) store.setItem(key, raw);
    else memory.set(key, raw);
  } catch {
    memory.set(key, raw);
  }
}

export function removeKey(key: string): void {
  try {
    store?.removeItem(key);
  } catch {
    /* bỏ qua */
  }
  memory.delete(key);
}
