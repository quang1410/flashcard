// Cổng canh style: bắt lỗi theme / a11y / i18n mà tsc và vitest thường không thấy.
// Mỗi luật là một hàm thuần trên nội dung file, có test chứng minh nó bắt được mẫu xấu.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const SRC = resolve(__dirname, "..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const isTest = (f: string) => /\.test\.(ts|tsx)$/.test(f) || f.includes("/test/");
const all = walk(SRC);
const rel = (f: string) => relative(SRC, f);
const appCode = all.filter((f) => /\.(ts|tsx)$/.test(f) && !isTest(f));
const tsxCode = appCode.filter((f) => f.endsWith(".tsx"));
const styleFiles = all.filter((f) => f.endsWith(".css") && !f.endsWith("styles/theme.css"));

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ---- luật -------------------------------------------------------------------------------------

/** Không mã màu cứng: component chỉ dùng biến ngữ nghĩa của theme. */
export function hardcodedColors(src: string): string[] {
  const code = stripComments(src);
  return [...code.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g)].map((m) => m[0]);
}

/** Theme tắt hết shadow: phân tầng bằng border và bậc surface. */
export function shadowClasses(src: string): string[] {
  return [...stripComments(src).matchAll(/(?<![\w-])(?:(?:inset|drop|text)-)?shadow-(?!none\b)[\w[\]/.-]+/g)].map((m) => m[0]);
}

/** Không huỷ viền focus bàn phím. */
export function killedFocusOutline(src: string): string[] {
  return [...stripComments(src).matchAll(/(?<![\w-])(?:[\w-]+:)*outline-(?:none|hidden)(?![\w-])/g)].map((m) => m[0]);
}

/** Chữ trạng thái phải dùng text-loss / text-warn (đạt 4,5:1), không dùng token lỗi/cảnh báo trần. */
export function weakStatusText(src: string): string[] {
  return [...stripComments(src).matchAll(/(?<![\w-])(?:[\w-]+:)*text-(?:destructive|warning)(?![\w-])/g)].map((m) => m[0]);
}

/** Chuỗi hiển thị phải nằm trong strings.ts: không chữ viết cứng trong JSX hay thuộc tính. */
export function hardcodedText(src: string): string[] {
  const code = stripComments(src);
  const found: string[] = [];
  for (const m of code.matchAll(/>\s*([^<>{}\n]*\p{L}[^<>{}\n]*?)\s*</gu)) found.push(m[1].trim());
  for (const m of code.matchAll(/\b(?:aria-label|title|placeholder|alt)="([^"{}]*\p{L}[^"{}]*)"/gu)) found.push(m[1]);
  return found;
}

/** `dark:` bám [data-theme], không dùng prefers-color-scheme (trừ khối reduced-motion). */
export function osColorSchemeQueries(src: string): string[] {
  return [...stripComments(src).matchAll(/prefers-color-scheme/g)].map((m) => m[0]);
}

// ---- áp dụng lên code thật --------------------------------------------------------------------

function expectClean(files: string[], rule: (s: string) => string[]) {
  const bad = files.flatMap((f) => rule(readFileSync(f, "utf8")).map((hit) => `${rel(f)}: ${hit}`));
  expect(bad, bad.join("\n")).toEqual([]);
}

describe("styleguard on the real source", () => {
  it("has no hard-coded colours outside theme.css", () => {
    expectClean([...appCode, ...styleFiles], hardcodedColors);
  });
  it("has no shadow-* classes", () => expectClean(appCode, shadowClasses));
  it("never removes the keyboard focus outline", () => expectClean(appCode, killedFocusOutline));
  it("uses text-loss / text-warn, not text-destructive / text-warning", () => expectClean(appCode, weakStatusText));
  it("has no visible text outside strings.ts", () => expectClean(tsxCode, hardcodedText));
  it("does not follow the OS colour scheme in CSS (theme is driven by [data-theme])", () =>
    expectClean(styleFiles, osColorSchemeQueries));
});

// ---- chứng minh luật bắt được mẫu xấu ---------------------------------------------------------

describe("styleguard rules catch bad samples", () => {
  it.each([
    ['const c = "#fff"', 1],
    ["color: #12b886;", 1],
    ["background: rgb(0 0 0)", 1],
    ["color: hsl(0 0% 0%)", 1],
    ["// #fff only in a comment", 0],
    ["color: var(--text-primary)", 0],
  ])("hardcodedColors(%j) -> %i hit(s)", (src, n) => expect(hardcodedColors(src)).toHaveLength(n));

  it.each([
    ['className="shadow-md"', 1],
    ['className="hover:shadow-lg"', 1],
    ['className="shadow-none"', 0],
    ['className="inset-shadow-x"', 1],
    ['className="drop-shadow-md"', 1],
    ['className="text-shadow-sm"', 1],
    ['className="shadow-none drop-shadow-none"', 0],
  ])("shadowClasses(%j) -> %i hit(s)", (src, n) => expect(shadowClasses(src)).toHaveLength(n));

  it.each([
    ['className="outline-none"', 1],
    ['className="focus:outline-hidden"', 1],
    ['className="outline-2"', 0],
  ])("killedFocusOutline(%j) -> %i hit(s)", (src, n) => expect(killedFocusOutline(src)).toHaveLength(n));

  it.each([
    ['className="text-destructive"', 1],
    ['className="hover:text-warning"', 1],
    ['className="text-destructive-foreground"', 0],
    ['className="text-loss text-warn"', 0],
  ])("weakStatusText(%j) -> %i hit(s)", (src, n) => expect(weakStatusText(src)).toHaveLength(n));

  it.each([
    ["<h1>Xin chào</h1>", 1],
    ['<button aria-label="Đóng">{icon}</button>', 1],
    ["<button>x</button>", 1],
    ['<input placeholder="Tìm từ" />', 1],
    ["<h1>{t('nav.review')}</h1>", 0],
    ["<div>{count}</div>", 0],
    ['<svg aria-hidden="true" />', 0],
  ])("hardcodedText(%j) -> %i hit(s)", (src, n) => expect(hardcodedText(src)).toHaveLength(n));

  it("flags prefers-color-scheme in css", () => {
    expect(osColorSchemeQueries("@media (prefers-color-scheme: dark) { a{} }")).toHaveLength(1);
  });
});
