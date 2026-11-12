import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { contrast, mergeTokens, parseTokens, readText, resolveHex, STYLES_DIR, type Mode } from "@/test/tokens";

const theme = readText(resolve(STYLES_DIR, "theme.css"));
const bridge = readText(resolve(STYLES_DIR, "bridge.css"));
const indexCss = readText(resolve(STYLES_DIR, "index.css"));
const tokens = mergeTokens(parseTokens(theme), parseTokens(bridge));
const modes: Mode[] = ["light", "dark"];

describe("theme.css", () => {
  it("is a byte-identical copy of docs/design/theme.css", () => {
    const source = readText(resolve(__dirname, "../../../docs/design/theme.css"));
    expect(theme).toBe(source);
  });
});

describe("bridge.css level tokens", () => {
  const levels = [1, 2, 3, 4, 5].map((n) => `--level-${n}`);

  it.each(modes)("defines --level-1..5 in %s mode as var() of existing theme tokens", (mode) => {
    const themeTokens = parseTokens(theme);
    const own = parseTokens(bridge);
    for (const name of levels) {
      const value = own[mode].get(name);
      expect(value, `${name} missing in ${mode}`).toBeDefined();
      const ref = /^var\((--[\w-]+)\)$/.exec(value!);
      expect(ref, `${name} must be var(--token), got ${value}`).not.toBeNull();
      expect(themeTokens.root.has(ref![1]), `${ref![1]} not defined in theme.css`).toBe(true);
    }
  });

  // Dùng được cho cả chữ lẫn mảng màu nên đòi 4,5:1 trên mọi nền chính. Bậc 600 ở giao diện sáng
  // (amber 3,19 / green 3,30) không đạt — đừng hạ bậc để "cho đẹp".
  const surfaces = ["--surface-base", "--surface-raised", "--surface-sunken", "--surface-modal"];
  const cases = modes.flatMap((mode) =>
    levels.flatMap((level) => surfaces.map((surface) => [mode, level, surface] as const)),
  );
  it.each(cases)("%s: %s has contrast >= 4.5 on %s", (mode, level, surface) => {
    const ratio = contrast(resolveHex(tokens, level, mode), resolveHex(tokens, surface, mode));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("level colours are all different from each other", () => {
    for (const mode of modes) {
      const hexes = levels.map((l) => resolveHex(tokens, l, mode));
      expect(new Set(hexes).size).toBe(5);
    }
  });
});

describe("contrast of core tokens", () => {
  const surfaces = ["--surface-base", "--surface-raised", "--surface-sunken", "--surface-modal"];
  const cases = modes.flatMap((m) => surfaces.map((s) => [m, s] as const));

  it.each(cases)("%s: --text-primary on %s >= 4.5", (mode, surface) => {
    expect(contrast(resolveHex(tokens, "--text-primary", mode), resolveHex(tokens, surface, mode))).toBeGreaterThanOrEqual(4.5);
  });

  // --primary-foreground (trắng) trên --primary chỉ đạt 2,55:1, nên nút chính dùng --cta.
  it.each(modes)("%s: --cta-foreground on --cta >= 4.5", (mode) => {
    expect(contrast(resolveHex(tokens, "--cta-foreground", mode), resolveHex(tokens, "--cta", mode))).toBeGreaterThanOrEqual(4.5);
  });

  // WCAG 1.4.11: vòng focus >= 3:1. --focus-ring trần của theme chỉ 2,58:1 trên nền trắng.
  it.each(cases)("%s: --ring-color on %s >= 3", (mode, surface) => {
    expect(contrast(resolveHex(tokens, "--ring-color", mode), resolveHex(tokens, surface, mode))).toBeGreaterThanOrEqual(3);
  });

  // Chữ phụ (text-muted-foreground) chỉ được đặt trên nền trang / thẻ / nền lõm. Trên --interactive-bg
  // (nền của bg-secondary) nó chỉ ~4,0:1 và trên hover chỉ ~3:1, nên đừng ghép chúng.
  const mutedSurfaces = ["--surface-base", "--surface-raised", "--surface-sunken"];
  it.each(modes.flatMap((m) => mutedSurfaces.map((s) => [m, s] as const)))(
    "%s: --text-muted on %s >= 4.5",
    (mode, surface) => {
      expect(contrast(resolveHex(tokens, "--text-muted", mode), resolveHex(tokens, surface, mode))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("bridge does not map ring to the bare --focus-ring token", () => {
    expect(bridge).toMatch(/--color-ring:\s*var\(--ring-color\)/);
    expect(bridge).not.toMatch(/--color-ring:\s*var\(--focus-ring\)/);
  });
});

describe("index.css", () => {
  it("binds the dark: variant to [data-theme=dark], not prefers-color-scheme", () => {
    expect(indexCss).toMatch(/@custom-variant dark \(&:where\(\[data-theme="dark"\]/);
  });

  it("sets color-scheme per theme so native scrollbars and controls follow dark mode", () => {
    expect(indexCss).toMatch(/\[data-theme="light"\][^{]*\{[^}]*color-scheme:\s*light/);
    expect(indexCss).toMatch(/\[data-theme="dark"\][^{]*\{[^}]*color-scheme:\s*dark/);
  });

  it("does not draw a focus ring around <main>, which is only a programmatic focus target", () => {
    expect(indexCss).toMatch(/main:focus\s*\{[^}]*outline:\s*none/);
  });

  it("switches transitions and animations off for prefers-reduced-motion", () => {
    expect(indexCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it("keeps form controls at 16px so iOS does not zoom on focus", () => {
    expect(indexCss).toMatch(/input[\s\S]*font-size:\s*16px/);
  });

  it("imports the Inter variable font (self-hosted, with the vietnamese subset)", () => {
    expect(indexCss).toContain("@fontsource-variable/inter");
  });
});
