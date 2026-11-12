import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { usePageTitle } from "@/lib/usePageTitle";
import { MAIN_ID } from "./AppShell";
import type { StringKey } from "@/i18n/strings";

/** Trang giữ chỗ: tiêu đề lấy từ i18n, nội dung thật làm ở ticket sau. */
export function PlaceholderPage({ titleKey }: { titleKey: StringKey }) {
  const { t } = useTranslation();
  usePageTitle(titleKey);
  return (
    <>
      <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
      <p className="mt-2 text-muted-foreground">{t("placeholder.body")}</p>
    </>
  );
}

/** Cài đặt giữ chỗ: chỉ có công tắc giao diện và ngôn ngữ. Tên, giọng đọc, đăng xuất thêm ở K-03. */
export function SettingsPage() {
  const { t } = useTranslation();
  usePageTitle("nav.settings");
  return (
    <>
      <h1 className="text-2xl font-semibold">{t("nav.settings")}</h1>
      <div className="mt-6 space-y-6">
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{t("settings.appearance")}</h2>
          <ThemeSwitch />
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{t("settings.language")}</h2>
          <LanguageSwitch />
        </section>
      </div>
    </>
  );
}

export function NotFoundPage() {
  const { t } = useTranslation();
  usePageTitle("notFound.title");
  return (
    <>
      <h1 className="text-2xl font-semibold">{t("notFound.title")}</h1>
      <p className="mt-4">
        <Link to="/" className="underline underline-offset-4">
          {t("notFound.back")}
        </Link>
      </p>
    </>
  );
}

/** Màn toàn màn hình, không có thanh điều hướng (phiên học, đăng nhập). */
export function FullScreenPage({ titleKey, exit }: { titleKey: StringKey; exit?: boolean }) {
  const { t } = useTranslation();
  usePageTitle(titleKey);
  return (
    <main id={MAIN_ID} tabIndex={-1} className="flex min-h-dvh flex-col bg-background p-4 text-foreground">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
        {exit && (
          <Link to="/" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            {t("study.exit")}
          </Link>
        )}
      </div>
      <p className="mt-2 text-muted-foreground">{t("placeholder.body")}</p>
    </main>
  );
}
