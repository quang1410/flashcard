import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Segmented } from "@/components/ui/segmented";
import { applyMode, readMode, type ThemeMode } from "@/lib/theme";

export function ThemeSwitch() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ThemeMode>(() => readMode());

  return (
    <Segmented<ThemeMode>
      label={t("settings.appearance")}
      value={mode}
      onChange={(m) => {
        applyMode(m);
        setMode(m);
      }}
      options={[
        { value: "light", label: t("theme.light") },
        { value: "dark", label: t("theme.dark") },
        { value: "system", label: t("theme.system") },
      ]}
    />
  );
}
