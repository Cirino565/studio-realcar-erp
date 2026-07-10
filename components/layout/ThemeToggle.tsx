"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "studio-theme";

function getDocumentTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";

  return document.documentElement.classList.contains("theme-dark")
    ? "dark"
    : "light";
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;

  root.classList.toggle("theme-light", theme === "light");
  root.classList.toggle("theme-dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const themeColor = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );

  if (themeColor) {
    themeColor.content = theme === "dark" ? "#0b1220" : "#f8fafc";
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // O tema continua aplicado mesmo quando o armazenamento está indisponível.
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode | null>(null);

  useEffect(() => {
    const currentTheme = getDocumentTheme();
    setTheme(currentTheme);
    applyTheme(currentTheme);
  }, []);

  function toggleTheme() {
    const currentTheme = theme ?? getDocumentTheme();
    const nextTheme: ThemeMode =
      currentTheme === "light" ? "dark" : "light";

    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  const isDark = theme === "dark";
  const label = isDark ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="theme-toggle-button group inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-2.5 text-xs font-semibold shadow-sm transition focus:outline-none focus:ring-4 focus:ring-violet-200"
    >
      <span className="flex size-5 items-center justify-center">
        {isDark ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )}
      </span>

      <span className="hidden xl:inline">
        {isDark ? "Claro" : "Escuro"}
      </span>
    </button>
  );
}
