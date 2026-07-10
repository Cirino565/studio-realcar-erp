import type { Viewport } from "next";
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
    var theme = savedTheme === "dark" ? "dark" : "light";
    var root = document.documentElement;

    root.classList.remove("theme-light", "theme-dark");
    root.classList.add("theme-" + theme);
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    var themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute(
        "content",
        theme === "dark" ? "#0b1220" : "#f8fafc"
      );
    }
  } catch (error) {
    document.documentElement.classList.add("theme-light");
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen w-full overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
