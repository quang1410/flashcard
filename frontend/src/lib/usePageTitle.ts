import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { StringKey } from "@/i18n/strings";

/** Đặt <title> theo trang: "<tên trang> – <tên app>" (WCAG 2.4.2). Đổi theo ngôn ngữ đang chọn. */
export function usePageTitle(titleKey: StringKey): void {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    document.title = `${t(titleKey)} – ${t("app.name")}`;
  }, [t, titleKey, i18n.language]);
}
