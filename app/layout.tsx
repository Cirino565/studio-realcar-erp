import type { Viewport } from "next";
import { cookies } from "next/headers";

import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8fafc",
};

const themeScript = `
(function () {
  try {
    var savedTheme = window.localStorage.getItem("studio-theme");

    if (savedTheme !== "light" && savedTheme !== "dark") {
      return;
    }

    var root = document.documentElement;

    root.classList.remove("theme-light", "theme-dark");
    root.classList.add("theme-" + savedTheme);
    root.dataset.theme = savedTheme;
    root.style.colorScheme = savedTheme;

    document.cookie =
      "studio-theme=" +
      savedTheme +
      "; Path=/; Max-Age=31536000; SameSite=Lax";
  } catch (error) {
    // O tema definido pelo servidor permanece ativo.
  }
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const savedTheme = cookieStore.get("studio-theme")?.value;
  const initialTheme = savedTheme === "dark" ? "dark" : "light";

  return (
    <html
      lang="pt-BR"
      className={`theme-${initialTheme}`}
      data-theme={initialTheme}
      style={{ colorScheme: initialTheme }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>

      <body className="min-h-screen w-full overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
