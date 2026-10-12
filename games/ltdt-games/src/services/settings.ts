import { readJson, writeJson } from "./storage";

export interface Settings {
  sound: boolean;
  /** 0–1 */
  volume: number;
  /** "system" theo prefers-reduced-motion của hệ điều hành */
  motion: "system" | "reduced" | "full";
  /** hiện pseudocode trong panel của Tôi là thuật toán */
  pseudocode: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, volume: 0.7, motion: "system", pseudocode: true };

const KEY = "smartedu-ltdt:settings:v1";

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<Settings>>(KEY, {}) };
}

export function saveSettings(s: Settings): void {
  writeJson(KEY, s);
}

export function systemPrefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}

export function isReducedMotion(s: Settings): boolean {
  return s.motion === "reduced" || (s.motion === "system" && systemPrefersReducedMotion());
}
