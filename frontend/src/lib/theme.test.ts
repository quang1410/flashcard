import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { readText } from "@/test/tokens";
import { applyMode, readMode, resolveTheme, subscribeSystemTheme, THEME_KEY } from "./theme";

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
  };
}

const blockedStore = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

describe("theme mode", () => {
  it("defaults to system when nothing is stored", () => {
    expect(readMode(memoryStore())).toBe("system");
  });

  it.each(["light", "dark", "system"] as const)("reads the stored mode %s", (mode) => {
    expect(readMode(memoryStore({ [THEME_KEY]: mode }))).toBe(mode);
  });

  it("falls back to system for garbage in storage", () => {
    expect(readMode(memoryStore({ [THEME_KEY]: "purple" }))).toBe("system");
  });

  it("resolves system by the OS preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("applyMode sets data-theme and stores explicit modes", () => {
    const root = document.createElement("html");
    const store = memoryStore();
    applyMode("dark", { root, store, prefersDark: false });
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(store.data[THEME_KEY]).toBe("dark");
  });

  it("applyMode(system) removes the stored key and follows the OS", () => {
    const root = document.createElement("html");
    const store = memoryStore({ [THEME_KEY]: "dark" });
    applyMode("system", { root, store, prefersDark: false });
    expect(root.getAttribute("data-theme")).toBe("light");
    expect(THEME_KEY in store.data).toBe(false);
  });

  it("still sets a valid data-theme when storage is blocked (private mode)", () => {
    const root = document.createElement("html");
    expect(() => applyMode("dark", { root, store: blockedStore, prefersDark: false })).not.toThrow();
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(readMode(blockedStore)).toBe("system");
  });

  it("follows OS changes only while the mode is system", () => {
    const listeners = new Set<(e: { matches: boolean }) => void>();
    const mql = {
      matches: false,
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.delete(fn),
    };
    const root = document.createElement("html");
    const store = memoryStore();
    const stop = subscribeSystemTheme({ root, store, matchMedia: () => mql as unknown as MediaQueryList });

    listeners.forEach((fn) => fn({ matches: true }));
    expect(root.getAttribute("data-theme")).toBe("dark");

    store.setItem(THEME_KEY, "light"); // người dùng chọn cố định
    root.setAttribute("data-theme", "light");
    listeners.forEach((fn) => fn({ matches: true }));
    expect(root.getAttribute("data-theme")).toBe("light"); // OS đổi sang tối cũng không kéo theo

    stop();
    expect(listeners.size).toBe(0);
  });
});

describe("index.html inline script", () => {
  // Script chạy trước React để không nháy sai màu; nó dùng cùng khoá với theme.ts / i18n.
  const html = readText(resolve(__dirname, "../../index.html"));

  it("uses the same storage keys as the app", () => {
    expect(html).toContain(`"${THEME_KEY}"`);
    expect(html).toContain('"flashcard.locale"');
  });

  it("sets data-theme before the app bundle loads", () => {
    expect(html.indexOf("data-theme")).toBeGreaterThan(-1);
    expect(html.indexOf("data-theme")).toBeLessThan(html.indexOf("/src/main.tsx"));
  });
});
