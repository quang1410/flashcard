// Đọc token từ theme.css / bridge.css để test tương phản và test "token trỏ tới biến có thật".
// Không phải code chạy trong app.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type Mode = "light" | "dark";
export type TokenSet = { root: Map<string, string>; light: Map<string, string>; dark: Map<string, string> };

export const STYLES_DIR = resolve(__dirname, "../styles");

export function readText(path: string): string {
  // Chuẩn hoá xuống dòng để so sánh không phụ thuộc CRLF.
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

/** Gom khai báo `--x: value` theo khối :root / [data-theme="light"] / [data-theme="dark"] (selector đúng nguyên văn). */
export function parseTokens(css: string): TokenSet {
  const out: TokenSet = { root: new Map(), light: new Map(), dark: new Map() };
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of clean.matchAll(blockRe)) {
    const selectors = m[1].split(",").map((s) => s.trim());
    const targets: (keyof TokenSet)[] = [];
    if (selectors.includes(":root")) targets.push("root");
    if (selectors.includes('[data-theme="light"]')) targets.push("light");
    if (selectors.includes('[data-theme="dark"]')) targets.push("dark");
    if (targets.length === 0) continue;
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      for (const t of targets) out[t].set(d[1], d[2].trim());
    }
  }
  return out;
}

export function mergeTokens(...sets: TokenSet[]): TokenSet {
  const out: TokenSet = { root: new Map(), light: new Map(), dark: new Map() };
  for (const s of sets) for (const k of ["root", "light", "dark"] as const) for (const [n, v] of s[k]) out[k].set(n, v);
  return out;
}

/** Giá trị của một token ở chế độ `mode`, đi theo chuỗi var(--...) tới khi ra mã hex. */
export function resolveHex(tokens: TokenSet, name: string, mode: Mode): string {
  let cur = name;
  for (let i = 0; i < 12; i++) {
    const v = tokens[mode].get(cur) ?? tokens.root.get(cur);
    if (v === undefined) throw new Error(`token ${cur} is not defined (resolving ${name}, ${mode})`);
    const ref = /^var\((--[\w-]+)\)$/.exec(v);
    if (ref) {
      cur = ref[1];
      continue;
    }
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    throw new Error(`token ${cur} resolves to ${v}, not a 6-digit hex`);
  }
  throw new Error(`token chain too deep for ${name}`);
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Tỉ lệ tương phản WCAG 2.x. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
