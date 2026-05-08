"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient as createSupabaseBrowserClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { getAuthCallbackUrl, getSiteUrl } from "../../lib/siteUrl";

type AuthMode = "signin" | "signup";

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 38,
        padding: "0 15px",
        borderRadius: 999,
        border: active
          ? "1px solid rgba(255,255,255,0.18)"
          : "1px solid rgba(255,255,255,0.08)",
        background: active ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.03)",
        color: active ? "white" : "#9ca3af",
        fontSize: 12,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    searchParams.get("error")
  );
  const configured = isSupabaseConfigured();

  const buttonLabel = useMemo(
    () => (mode === "signin" ? "Sign In" : "Create Account"),
    [mode]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage(
        "Supabase is not configured yet. Add your project URL and anon key in .env.local first."
      );
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        router.replace("/");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl("/"),
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }

      setMessage(
        `Account created. Check your email to confirm your account. If confirmation is enabled, you will come back through ${getSiteUrl()}/auth/callback before ReelShelf opens.`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "18px 0 56px" }}>
      <style>{`
        .auth-grid {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
          gap: 24px;
        }

        @media (max-width: 960px) {
          .auth-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .auth-grid {
            gap: 16px;
          }
        }
      `}</style>
      <section
        className="auth-grid"
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 30,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 28%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06), transparent 20%), linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(7,7,7,0.98) 100%)",
            padding: "clamp(22px, 5vw, 34px) clamp(20px, 5vw, 34px) clamp(22px, 5vw, 30px)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              color: "#7f7f7f",
              fontSize: 11,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            ReelShelf Account
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2.4rem, 8vw, 56px)",
              lineHeight: 0.98,
              letterSpacing: "-2.2px",
              fontWeight: 600,
              maxWidth: 720,
            }}
          >
            Turn ReelShelf into a real personal library.
          </h1>

          <p
            style={{
              margin: "16px 0 0",
              color: "#c7c7c7",
              fontSize: "clamp(15px, 3.8vw, 18px)",
              lineHeight: 1.65,
              maxWidth: 760,
            }}
          >
            Create an account to sync your diary, watchlist, reading shelf, and
            profile insights across devices with real backend persistence.
          </p>

          <div
            style={{
              display: "grid",
              gap: 14,
              marginTop: 26,
            }}
          >
            {[
              "Diary entries saved to your account",
              "Watchlist and Reading Shelf scoped per user",
              "Profile insights backed by real persisted data",
            ].map((item) => (
              <div
                key={item}
                style={{
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: "14px 16px",
                  color: "#e5e7eb",
                  fontSize: 15,
                  lineHeight: 1.6,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            borderRadius: 30,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.96) 0%, rgba(10,10,10,0.97) 100%)",
            padding: "clamp(20px, 5vw, 28px)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.24)",
          }}
        >
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <ModeButton
              active={mode === "signin"}
              label="Sign In"
              onClick={() => setMode("signin")}
            />
            <ModeButton
              active={mode === "signup"}
              label="Sign Up"
              onClick={() => setMode("signup")}
            />
          </div>

          {!configured ? (
            <div
              style={{
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                padding: 18,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#e5e7eb",
                  fontSize: 15,
                  lineHeight: 1.7,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                Supabase is not configured yet. Add
                {" "}`NEXT_PUBLIC_SUPABASE_URL` and
                {" "}`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local`,
                set `NEXT_PUBLIC_SITE_URL`, then run the SQL in `supabase/schema.sql`.
              </p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <label style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <span
                style={{
                  color: "#d1d5db",
                  fontSize: 13,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                style={{
                  height: 50,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  color: "white",
                  padding: "0 14px",
                  fontSize: 15,
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 10, marginBottom: 18 }}>
              <span
                style={{
                  color: "#d1d5db",
                  fontSize: 13,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                style={{
                  height: 50,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  color: "white",
                  padding: "0 14px",
                  fontSize: 15,
                  outline: "none",
                }}
              />
            </label>

            {message ? (
              <p
                style={{
                  margin: "0 0 18px",
                  color: "#d1d5db",
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              style={{
                minHeight: 46,
                padding: "12px 18px",
                borderRadius: 999,
                background: "white",
                color: "black",
                border: "none",
                cursor: loading ? "progress" : "pointer",
                fontWeight: 600,
              }}
            >
              {loading ? "Working..." : buttonLabel}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
