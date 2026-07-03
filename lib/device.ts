export function isMobileUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) return false;

  const ua = userAgent.toLowerCase();

  return (
    ua.includes("android") ||
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod") ||
    ua.includes("mobile")
  );
}