// Checklist UI trước khi giao (mục 7.5 kế hoạch), đo trên trang đang mở:
// - vùng chạm: cảm ứng ≥ 44 px và cách nhau ≥ 8 px; chuột ≥ 24 px (WCAG 2.5.8)
// - mọi phần tử bấm được có cursor: pointer
// - chữ HTML tương phản ≥ 4.5:1 (chữ lớn ≥ 3:1)
// Chữ trong SVG (nhãn đỉnh, thẻ giá) chọn màu theo ART_DIRECTION.md, không đo ở đây.

import type { Page } from "@playwright/test";

export function uiChecklist(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const coarse = matchMedia("(pointer: coarse)").matches;
    const MIN = coarse ? 44 : 24;
    const GAP = coarse ? 8 : 0;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && Number(cs.opacity) > 0;
    };
    const name = (el: Element) =>
      (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
    // hộp thoại đang mở thì chỉ xét phần tử trong hộp thoại
    const modal = document.querySelector('[aria-modal="true"]');
    const targets = [
      ...document.querySelectorAll(
        'button, a[href], input:not([type=radio]):not([type=checkbox]), select, [role="button"], label.lg-switch, label.lg-seg__opt',
      ),
    ]
      // đường trong Thành phố bùn là path dài theo hình con đường; thẻ giá đã kiểm trong app.spec
      .filter((el) => visible(el) && !el.closest("[data-road]") && (!modal || modal.contains(el)))
      .filter((el) => !(el as HTMLButtonElement).disabled && el.getAttribute("aria-disabled") !== "true");

    for (const el of targets) {
      const r = el.getBoundingClientRect();
      if (r.width < MIN - 0.5 || r.height < MIN - 0.5) out.push(`vùng chạm nhỏ: ${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      const range = el instanceof HTMLInputElement && el.type === "range";
      if (!range && getComputedStyle(el).cursor !== "pointer") out.push(`thiếu cursor pointer: ${name(el)}`);
    }
    if (GAP)
      for (let i = 0; i < targets.length; i++)
        for (let j = i + 1; j < targets.length; j++) {
          const a = targets[i];
          const b = targets[j];
          if (a.contains(b) || b.contains(a)) continue;
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          const dx = Math.max(0, Math.max(ra.left, rb.left) - Math.min(ra.right, rb.right));
          const dy = Math.max(0, Math.max(ra.top, rb.top) - Math.min(ra.bottom, rb.bottom));
          const gap = Math.hypot(dx, dy);
          if (gap < GAP - 0.5) out.push(`hai vùng chạm sát nhau (${gap.toFixed(1)} px): ${name(a)} và ${name(b)}`);
        }

    // thanh nút dưới màn chơi: kể cả nút đang khóa, không được đè nhau, tràn khỏi màn hình hay bị cắt chữ
    const bar = [...document.querySelectorAll(".lg-controls button")].filter(visible);
    for (let i = 0; i < bar.length; i++) {
      const ra = bar[i].getBoundingClientRect();
      if (ra.left < -0.5 || ra.right > innerWidth + 0.5) out.push(`nút tràn khỏi màn hình: ${name(bar[i])}`);
      if (bar[i].scrollWidth > bar[i].clientWidth + 1) out.push(`chữ trong nút bị cắt: ${name(bar[i])}`);
      for (let j = i + 1; j < bar.length; j++) {
        const rb = bar[j].getBoundingClientRect();
        if (Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left) > 0.5 && Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > 0.5)
          out.push(`hai nút đè nhau: ${name(bar[i])} và ${name(bar[j])}`);
      }
    }

    type RGBA = { r: number; g: number; b: number; a: number };
    const parse = (c: string): RGBA | null => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const mix = (top: RGBA, bot: RGBA): RGBA => ({
      r: top.r * top.a + bot.r * (1 - top.a),
      g: top.g * top.a + bot.g * (1 - top.a),
      b: top.b * top.a + bot.b * (1 - top.a),
      a: 1,
    });
    const lum = ({ r, g, b }: RGBA) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    /** nền thật phía sau chữ; null khi nền là gradient (không đo được) */
    const background = (el: Element): RGBA | null => {
      const layers: RGBA[] = [];
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.backgroundImage !== "none" && !cs.backgroundImage.startsWith("url")) return null;
        const c = parse(cs.backgroundColor);
        if (c && c.a > 0) {
          layers.push(c);
          if (c.a >= 1) break;
        }
      }
      return layers.reduceRight<RGBA>((acc, c) => mix(c, acc), { r: 255, g: 255, b: 255, a: 1 });
    };
    const seen = new Set<Element>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || !n.textContent?.trim() || seen.has(el)) continue;
      seen.add(el);
      if (el.closest("svg, .lg-sr-only, [aria-hidden=true], button:disabled, [aria-disabled=true]") || !visible(el)) continue;
      if (modal && !modal.contains(el)) continue;
      const bg = background(el);
      if (!bg) continue;
      const cs = getComputedStyle(el);
      let opacity = 1;
      for (let e: Element | null = el; e; e = e.parentElement) opacity *= Number(getComputedStyle(e).opacity);
      const fg0 = parse(cs.color);
      if (!fg0) continue;
      const fg = mix({ ...fg0, a: fg0.a * opacity }, bg);
      const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      const ratio = (hi + 0.05) / (lo + 0.05);
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (Number(cs.fontWeight) >= 700 && size >= 18.66);
      if (ratio < (large ? 3 : 4.5)) out.push(`tương phản ${ratio.toFixed(2)}:1: "${n.textContent.trim().slice(0, 30)}" (${size}px)`);
    }
    if (document.documentElement.scrollWidth > window.innerWidth) out.push("tràn ngang");
    return out;
  });
}
