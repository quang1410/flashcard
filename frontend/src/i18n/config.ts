import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en, vi } from "./strings";

export type Locale = "vi" | "en";

// Khoá này cũng nằm trong script inline của index.html (chạy trước React). Đổi một nơi thì đổi cả hai —
// lib/theme.test.ts canh điều đó.
export const LOCALE_KEY = "flashcard.locale";

function storedLocale(): Locale {
  try {
    return localStorage.getItem(LOCALE_KEY) === "en" ? "en" : "vi";
  } catch {
    return "vi"; // storage bị chặn (chế độ riêng tư)
  }
}

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: storedLocale(),
  fallbackLng: "vi",
  supportedLngs: ["vi", "en"],
  keySeparator: false,
  nsSeparator: false,
  // MỘT ngoặc {n}. Mặc định của react-i18next là {{n}}: viết hai ngoặc vẫn biên dịch và hiện nguyên văn lên màn hình.
  interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  react: { useSuspense: false },
});

document.documentElement.lang = i18n.language;

export async function setLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* không lưu được thì lần sau về mặc định */
  }
}
