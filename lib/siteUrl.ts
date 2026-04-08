function normalizeUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getSiteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (explicitUrl) {
    return normalizeUrl(explicitUrl);
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;

  if (vercelUrl) {
    const protocolPrefixed = vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`;

    return normalizeUrl(protocolPrefixed);
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return normalizeUrl(window.location.origin);
  }

  return "http://localhost:3000";
}

export function getAuthCallbackUrl(next = "/") {
  const baseUrl = getSiteUrl();
  const callbackUrl = new URL("/auth/callback", baseUrl);
  callbackUrl.searchParams.set("next", next);
  return callbackUrl.toString();
}
