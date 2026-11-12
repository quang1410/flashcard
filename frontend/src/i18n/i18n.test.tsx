import { describe, expect, it } from "vitest";
import i18n from "i18next";
import { strings, vi, en } from "./strings";
import { LOCALE_KEY, setLocale } from "./config";

describe("strings.ts", () => {
  it("has a non-empty vi and en for every entry", () => {
    for (const [key, entry] of Object.entries(strings)) {
      expect(entry.vi.trim(), `${key}.vi`).not.toBe("");
      expect(entry.en.trim(), `${key}.en`).not.toBe("");
    }
  });

  it("derives vi and en tables with the same keys", () => {
    expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort());
  });

  it("never uses double-brace interpolation", () => {
    for (const [key, entry] of Object.entries(strings)) {
      expect(entry.vi, key).not.toContain("{{");
      expect(entry.en, key).not.toContain("{{");
    }
  });

  it("uses the same placeholders in vi and en", () => {
    const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [key, entry] of Object.entries(strings)) {
      expect(names(entry.vi), key).toEqual(names(entry.en));
    }
  });
});

describe("i18n runtime", () => {
  it("defaults to Vietnamese", async () => {
    await setLocale("vi");
    expect(i18n.t("nav.review")).toBe("Ôn tập");
  });

  it("interpolates {n} with a single brace and leaves no brace behind", async () => {
    await setLocale("vi");
    expect(i18n.t("items.count", { n: 3 })).toBe("3 mục");
    await setLocale("en");
    expect(i18n.t("items.count", { n: 3 })).toBe("3 items");
    expect(i18n.t("items.count", { n: 3 })).not.toContain("{");
  });

  it("falls back to Vietnamese for a key missing in English", () => {
    expect(i18n.options.fallbackLng).toEqual(["vi"]);
  });

  it("setLocale updates <html lang> and remembers the choice", async () => {
    await setLocale("en");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem(LOCALE_KEY)).toBe("en");
    await setLocale("vi");
    expect(document.documentElement.lang).toBe("vi");
  });
});
