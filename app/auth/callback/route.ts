import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv, isSupabaseConfigured } from "../../../lib/supabase/config";

export async function GET(request: NextRequest) {
  const requestedNextPath = request.nextUrl.searchParams.get("next");
  const nextPath =
    requestedNextPath &&
    requestedNextPath.startsWith("/") &&
    !requestedNextPath.startsWith("//")
      ? requestedNextPath
      : "/";
  const redirectUrl = new URL(nextPath, request.url);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  let response = NextResponse.redirect(redirectUrl);
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        response = NextResponse.redirect(redirectUrl);

        for (const cookie of cookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const authUrl = new URL("/auth", request.url);
      authUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(authUrl);
    }
  }

  return response;
}
