// Âm thanh bằng Web Audio. Chỉ khởi động sau tương tác đầu tiên (chính sách autoplay).
// Trình duyệt không giải mã được OGG thì tự chuyển sang âm tổng hợp, không báo lỗi.

export type SoundName =
  | "tap"
  | "tick"
  | "undo"
  | "correct"
  | "invalid"
  | "wrong"
  | "draw"
  | "pave"
  | "unpave"
  | "stuck"
  | "open"
  | "close"
  | "hint"
  | "star"
  | "toggle"
  | "win"
  | "fail"
  | "badge";

const NAMES: SoundName[] = [
  "tap",
  "tick",
  "undo",
  "correct",
  "invalid",
  "wrong",
  "draw",
  "pave",
  "unpave",
  "stuck",
  "open",
  "close",
  "hint",
  "star",
  "toggle",
  "win",
  "fail",
  "badge",
];

/** Âm dự phòng: [tần số Hz, thời lượng s][] */
const SYNTH: Record<SoundName, [number, number][]> = {
  tap: [[660, 0.05]],
  tick: [[880, 0.04]],
  undo: [[440, 0.06]],
  correct: [
    [660, 0.08],
    [990, 0.12],
  ],
  invalid: [[220, 0.08]],
  wrong: [
    [330, 0.1],
    [247, 0.16],
  ],
  draw: [[520, 0.05]],
  pave: [[300, 0.07]],
  unpave: [[250, 0.07]],
  stuck: [[196, 0.25]],
  open: [[600, 0.05]],
  close: [[500, 0.05]],
  hint: [
    [700, 0.06],
    [900, 0.08],
  ],
  star: [[1046, 0.12]],
  toggle: [[750, 0.04]],
  win: [
    [523, 0.1],
    [659, 0.1],
    [784, 0.1],
    [1046, 0.25],
  ],
  fail: [
    [392, 0.14],
    [330, 0.14],
    [262, 0.3],
  ],
  badge: [
    [587, 0.08],
    [740, 0.08],
    [880, 0.08],
    [1175, 0.3],
  ],
};

export class AudioService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private muted = false;
  private volume = 0.7;

  constructor(private readonly base: string) {}

  setMuted(m: boolean) {
    this.muted = m;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  /** Gọi trong một sự kiện chạm/nhấn đầu tiên. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.loading ??= this.loadAll();
  }

  private async loadAll() {
    const ctx = this.ctx!;
    await Promise.all(
      NAMES.map(async (n) => {
        try {
          const res = await fetch(`${this.base}audio/${n}.ogg`);
          if (!res.ok) return;
          const buf = await ctx.decodeAudioData(await res.arrayBuffer());
          this.buffers.set(n, buf);
        } catch {
          /* dùng âm tổng hợp */
        }
      }),
    );
  }

  play(name: SoundName, opts: { rate?: number; gain?: number } = {}) {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== "running") return;
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = opts.gain ?? 1;
    out.connect(this.master);
    const buf = this.buffers.get(name);
    if (buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts.rate ?? 1;
      src.connect(out);
      src.start();
      return;
    }
    let t = ctx.currentTime;
    for (const [f, d] of SYNTH[name]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f * (opts.rate ?? 1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + d + 0.02);
      t += d * 0.9;
    }
  }
}
