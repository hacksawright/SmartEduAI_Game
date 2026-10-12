import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { idempotencyKey, localIsoTimestamp, type LearningEvent } from "../core/events";
import type { Level } from "../core/levels/types";
import { RACE_SUFFIX } from "../core/registry";
import type { Stars } from "../core/scoring";
import { verifySubmission, type Submission } from "../core/verify";
import { Analytics, httpSink, type AnalyticsName } from "../services/analytics";
import { AudioService, type SoundName } from "../services/audio";
import { awardBadges, type BadgeDef } from "../services/badges";
import { SocraticHintProvider, StaticHintProvider, type HintProvider } from "../services/hints";
import { HttpPointsClient, LocalPointsClient, type PointsClient, type PointsResult } from "../services/points";
import {
  bestStars,
  clearProgress,
  loadProgress,
  mergeRemote,
  recordComplete,
  recordStart,
  saveProgress,
  type ProgressState,
} from "../services/progress";
import { loadSettings, saveSettings, systemPrefersReducedMotion, type Settings } from "../services/settings";
import type { ResolvedConfig } from "./config";
import type { Route } from "./router";

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "success" | "error";
}

export interface CompletionInput {
  level: Level;
  /** id gửi đi, có thể có hậu tố -race */
  levelId: string;
  submission: Submission;
  durationMs: number;
  hints: number;
}

export interface CompletionResult {
  ok: boolean;
  stars: Stars;
  score: number;
  prevBest: number;
  points: PointsResult | null;
  badges: BadgeDef[];
  reason?: string;
}

interface Ctx {
  config: ResolvedConfig;
  route: Route;
  navigate: (r: Route, opts?: { replace?: boolean }) => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  reducedMotion: boolean;
  progress: ProgressState;
  markTutorialSeen: (game: Level["game"]) => void;
  resetProgress: () => void;
  play: (s: SoundName, opts?: { rate?: number; gain?: number }) => void;
  track: (name: AnalyticsName, payload?: Record<string, unknown>) => void;
  hints: HintProvider;
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  confetti: number;
  celebrate: () => void;
  startLevel: (levelId: string) => void;
  completeLevel: (input: CompletionInput) => Promise<CompletionResult>;
}

const GamesContext = createContext<Ctx | null>(null);

export function useGames(): Ctx {
  const c = useContext(GamesContext);
  if (!c) throw new Error("useGames phải nằm trong GamesProvider");
  return c;
}

export function GamesProvider(props: {
  config: ResolvedConfig;
  route: Route;
  navigate: Ctx["navigate"];
  children: ReactNode;
}) {
  const { config } = props;
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress(config.userId));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confetti, setConfetti] = useState(0);
  const [systemReduced, setSystemReduced] = useState(systemPrefersReducedMotion);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const audio = useMemo(() => new AudioService(config.assetBase), [config.assetBase]);
  const points = useMemo<PointsClient>(
    () =>
      config.apiBase
        ? new HttpPointsClient(config.apiBase, config.userId, config.authToken)
        : new LocalPointsClient(config.userId),
    [config.apiBase, config.userId, config.authToken],
  );
  const hints = useMemo<HintProvider>(
    () => (config.hintEndpoint ? new SocraticHintProvider(config.hintEndpoint, config.authToken) : new StaticHintProvider()),
    [config.hintEndpoint, config.authToken],
  );
  const analytics = useMemo(() => {
    const a = new Analytics({ user_id: config.userId, course_id: config.courseId });
    if (config.onEvent) a.addSink((n, p) => config.onEvent!(n, p));
    if (config.apiBase) a.addSink(httpSink(config.apiBase, config.authToken));
    if (import.meta.env.DEV) a.addSink((n, p) => console.debug("[analytics]", n, p));
    return a;
  }, [config]);

  useEffect(() => {
    const mq = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setSystemReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    audio.setMuted(!settings.sound);
    audio.setVolume(settings.volume);
  }, [audio, settings.sound, settings.volume]);

  useEffect(() => {
    saveProgress(config.userId, progress);
  }, [config.userId, progress]);

  // số lần đã nộp bài trong phiên; GET /progress trả về sau một lần nộp thì tổng điểm trong đó đã cũ
  const submitted = useRef(0);

  // Gửi lại event đang xếp hàng, rồi gộp tiến độ trên server: đổi máy vẫn giữ sao và màn đã mở
  useEffect(() => {
    let alive = true;
    const seq = submitted.current;
    void (async () => {
      await points.flush?.();
      const remote = await points.fetchProgress?.();
      if (!alive || !remote) return;
      const merged = mergeRemote(progressRef.current, remote, { points: submitted.current === seq });
      if (merged === progressRef.current) return;
      // huy hiệu đạt nhờ tiến độ ở máy khác: ghi nhận lặng lẽ, không hiện thông báo
      const next = awardBadges(merged).state;
      progressRef.current = next;
      setProgress(next);
    })();
    return () => {
      alive = false;
    };
  }, [points]);

  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
    };
  }, [audio]);

  const reducedMotion = settings.motion === "reduced" || (settings.motion === "system" && systemReduced);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const n = { ...s, ...patch };
      saveSettings(n);
      return n;
    });
  }, []);

  const toastId = useRef(0);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (text: string, tone: Toast["tone"] = "info") => {
      const id = ++toastId.current;
      setToasts((t) => [...t.slice(-2), { id, text, tone }]);
      setTimeout(() => dismissToast(id), 3200);
    },
    [dismissToast],
  );

  const play = useCallback((s: SoundName, opts?: { rate?: number; gain?: number }) => audio.play(s, opts), [audio]);
  const track = useCallback(
    (name: AnalyticsName, payload: Record<string, unknown> = {}) => analytics.track(name, payload),
    [analytics],
  );

  const startLevel = useCallback((levelId: string) => setProgress((p) => recordStart(p, levelId)), []);

  const completeLevel = useCallback(
    async (input: CompletionInput): Promise<CompletionResult> => {
      const { level, levelId } = input;
      const prevBest = bestStars(progressRef.current, levelId);
      const v = verifySubmission(levelId, input.submission);
      if (!v.ok) {
        return { ok: false, stars: 1, score: 0, prevBest, points: null, badges: [], reason: v.reason };
      }
      const attempts = (progressRef.current.levels[levelId]?.attempts ?? 0) || 1;
      submitted.current++;
      const ev: LearningEvent = {
        event: "game_level_completed",
        idempotency_key: idempotencyKey(config.userId, level.game, levelId, v.stars),
        user_id: config.userId,
        course_id: config.courseId,
        chapter_id: level.chapter,
        game_id: level.game,
        level_id: levelId,
        stars: v.stars,
        score: v.score,
        hints_used: input.hints,
        attempts,
        duration_ms: Math.round(input.durationMs),
        timestamp: localIsoTimestamp(),
        submission: input.submission,
      };
      let pts: PointsResult | null = null;
      try {
        pts = await points.submit(ev);
      } catch {
        pts = null;
      }
      try {
        config.onEvent?.("learning_event", ev as unknown as Record<string, unknown>);
      } catch {
        /* lỗi trong hàm của trang chủ không được chặn hộp kết quả (giống các sink analytics) */
      }

      // Tính tiến độ mới ngay tại đây (không chờ updater của React) để biết huy hiệu vừa đạt.
      let next = recordComplete(progressRef.current, levelId, {
        stars: v.stars,
        score: v.score,
        hints: input.hints,
        durationMs: input.durationMs,
      });
      if (pts?.total != null) next = { ...next, points: pts.total };
      else if (pts?.credited) next = { ...next, points: next.points + pts.credited };
      const awarded = awardBadges(next);
      progressRef.current = awarded.state;
      setProgress(awarded.state);

      analytics.track("game_level_completed", {
        chapter_id: level.chapter,
        game_id: level.game,
        level_id: levelId,
        stars: v.stars,
        score: v.score,
        hints_used: input.hints,
        duration_ms: Math.round(input.durationMs),
        is_voluntary_replay: prevBest === 3,
        race: levelId.endsWith(RACE_SUFFIX),
      });

      return { ok: true, stars: v.stars, score: v.score, prevBest, points: pts, badges: awarded.earned };
    },
    [analytics, config, points],
  );

  const markTutorialSeen = useCallback(
    (game: Level["game"]) => setProgress((p) => ({ ...p, seenTutorial: { ...p.seenTutorial, [game]: true } })),
    [],
  );

  const resetProgress = useCallback(() => {
    clearProgress(config.userId);
    // điểm thưởng đã cộng vào hệ thống không bị xóa (Cài đặt → Dữ liệu), nên tổng điểm giữ nguyên
    const next = { ...loadProgress(config.userId), points: progressRef.current.points };
    progressRef.current = next;
    setProgress(next);
  }, [config.userId]);

  const celebrate = useCallback(() => setConfetti((c) => c + 1), []);

  const value: Ctx = {
    config,
    route: props.route,
    navigate: props.navigate,
    settings,
    updateSettings,
    reducedMotion,
    progress,
    markTutorialSeen,
    resetProgress,
    play,
    track,
    hints,
    toasts,
    toast,
    dismissToast,
    confetti,
    celebrate,
    startLevel,
    completeLevel,
  };

  return <GamesContext.Provider value={value}>{props.children}</GamesContext.Provider>;
}
