import { useTranslation } from "react-i18next";
import { Segmented } from "@/components/ui/segmented";
import { setLocale, type Locale } from "@/i18n/config";

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const current: Locale = i18n.language === "en" ? "en" : "vi";

  return (
    <Segmented<Locale>
      label={t("settings.language")}
      value={current}
      onChange={(l) => void setLocale(l)}
      options={[
        { value: "vi", label: t("lang.vi"), lang: "vi" },
        { value: "en", label: t("lang.en"), lang: "en" },
      ]}
    />
  );
}
