"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "studio-theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const listeners = new Set<() => void>();

function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;

  try {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
  } catch {
    return null;
  }

  return null;
}

function getDocumentTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";

  return document.documentElement.classList.contains("theme-dark")
    ? "dark"
    : "light";
}

function getSnapshot(): ThemeMode {
  return getStoredTheme() ?? getDocumentTheme();
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function emitThemeChange() {
  listeners.forEach((listener) => listener());
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;

  root.classList.remove("theme-light", "theme-dark");
  root.classList.add(`theme-${theme}`);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // O tema continua aplicado mesmo sem acesso ao armazenamento local.
  }

  document.cookie = `${STORAGE_KEY}=${theme}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;

  const themeColor = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );

  if (themeColor) {
    themeColor.content = theme === "dark" ? "#0b1220" : "#f8fafc";
  }

  emitThemeChange();
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = theme === "dark";
  const label = isDark ? "Ativar modo claro" : "Ativar modo escuro";

  function toggleTheme() {
    applyTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="theme-toggle-button group inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-2.5 text-xs font-semibold shadow-sm transition focus:outline-none focus:ring-4 focus:ring-violet-200"
    >
      <span className="flex size-5 items-center justify-center">
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </span>

      <span className="hidden xl:inline">{isDark ? "Claro" : "Escuro"}</span>
    </button>
  );
}
