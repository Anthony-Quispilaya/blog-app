import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseClient";

WebBrowser.maybeCompleteAuthSession();

function extractParamsFromUrl(url: string) {
  const parsed = new URL(url);
  const queryParams = parsed.searchParams;
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));

  const code = queryParams.get("code") ?? hashParams.get("code");
  const accessToken =
    queryParams.get("access_token") ?? hashParams.get("access_token");
  const refreshToken =
    queryParams.get("refresh_token") ?? hashParams.get("refresh_token");
  const errorDescription =
    queryParams.get("error_description") ??
    hashParams.get("error_description") ??
    queryParams.get("error") ??
    hashParams.get("error");

  return { code, accessToken, refreshToken, errorDescription };
}

function buildRedirectUrl() {
  const appOwnership = Constants.appOwnership;

  if (Platform.OS === "web") {
    // Prefer the runtime origin so dev ports (8081/8082/etc) always match.
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }

    const envUrl = process.env.EXPO_PUBLIC_WEB_URL?.trim();
    if (envUrl) {
      return envUrl.replace(/\/+$/, "");
    }

    return Linking.createURL("");
  }

  if (appOwnership === "expo") {
    return Linking.createURL("");
  }

  return "blogapp://auth/callback";
}

function uniqueStrings(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

async function startGoogleOAuth(redirectTo: string) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  return { data, error };
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        // On web, Supabase OAuth commonly returns a PKCE code in the URL.
        // Because our Supabase client has detectSessionInUrl disabled, we
        // must exchange it ourselves to restore the session on refresh.
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const { code, accessToken, refreshToken, errorDescription } =
            extractParamsFromUrl(window.location.href);

          if (errorDescription) {
            // Keep bootstrapping; session may already exist.
            console.warn("Supabase auth callback error:", errorDescription);
          }

          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
            // Remove auth params from the URL so refreshes are clean.
            window.history.replaceState({}, "", window.location.pathname);
          } else if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            window.history.replaceState({}, "", window.location.pathname);
          }
        }
      } catch (error) {
        console.warn("Auth bootstrap failed:", error);
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }
      setSession(data.session ?? null);
      setIsLoading(false);
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      setIsLoading(true);
      const primaryRedirectTo = buildRedirectUrl();
      const normalizedPrimary = primaryRedirectTo.replace(/\/+$/, "");

      const runtimeOrigin =
        Platform.OS === "web" && typeof window !== "undefined"
          ? window.location?.origin?.replace(/\/+$/, "")
          : undefined;

      // Web OAuth: prefer a stable in-app route (/login) but fall back to the
      // bare origin if the Supabase project only allows the base URL.
      const preferredWebRedirectTo = runtimeOrigin
        ? `${runtimeOrigin}/login`
        : `${normalizedPrimary}/login`;

      const fallbackWebRedirectTo = runtimeOrigin || normalizedPrimary;

      const webCandidates = uniqueStrings([
        preferredWebRedirectTo,
        fallbackWebRedirectTo,
      ]);

      const nativeCandidates = uniqueStrings([
        primaryRedirectTo,
        Linking.createURL(""),
        Linking.createURL("auth/callback"),
        "blogapp://auth/callback",
      ]);

      const candidates =
        Platform.OS === "web" ? webCandidates : nativeCandidates;

      // Web: perform a full-page redirect. The callback will be handled on app
      // load via the AuthProvider bootstrap (exchangeCodeForSession / setSession).
      if (Platform.OS === "web") {
        let lastError: Error | null = null;
        for (const candidate of candidates) {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: candidate,
              skipBrowserRedirect: false,
            },
          });

          if (!error) {
            // Redirect should happen; keep loading state as-is.
            return { error: null };
          }

          lastError = new Error(`${error.message} (redirectTo: ${candidate})`);

          if (!/requested path is invalid/i.test(error.message)) {
            break;
          }
        }

        setIsLoading(false);

        const expectedRedirect = preferredWebRedirectTo;

        return {
          error:
            lastError ??
            new Error(
              `Unable to start Google sign-in. In Supabase Dashboard → Authentication → URL Configuration, add this exact redirect URL to Additional Redirect URLs: ${expectedRedirect}. If your project only allows the base origin, add: ${fallbackWebRedirectTo}`,
            ),
        };
      }

      let redirectTo = candidates[0] ?? primaryRedirectTo;
      let data: Awaited<ReturnType<typeof startGoogleOAuth>>["data"] | null =
        null;
      let error: Awaited<ReturnType<typeof startGoogleOAuth>>["error"] | null =
        null;

      for (const candidate of candidates) {
        redirectTo = candidate;
        ({ data, error } = await startGoogleOAuth(candidate));

        if (!error) {
          break;
        }

        if (!/requested path is invalid/i.test(error.message)) {
          break;
        }
      }

      if (error || !data?.url) {
        setIsLoading(false);
        return {
          error: new Error(
            `${error?.message || "Unable to start Google sign-in."} (redirectTo: ${redirectTo})`,
          ),
        };
      }

      const authResult = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );

      if (authResult.type !== "success" || !authResult.url) {
        await wait(400);
        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData.session) {
          setSession(sessionData.session);
          setIsLoading(false);
          return { error: null };
        }

        setIsLoading(false);
        return {
          error: new Error(
            `Google sign-in was cancelled (type: ${authResult.type}, redirectTo: ${redirectTo}). Add this exact redirect in Supabase Additional Redirect URLs and ensure Site URL is not localhost.`,
          ),
        };
      }

      const { code, accessToken, refreshToken, errorDescription } =
        extractParamsFromUrl(authResult.url);

      if (errorDescription) {
        setIsLoading(false);
        return { error: new Error(errorDescription) };
      }

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        setIsLoading(false);
        return {
          error: exchangeError ? new Error(exchangeError.message) : null,
        };
      }

      if (accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        setIsLoading(false);
        return {
          error: setSessionError ? new Error(setSessionError.message) : null,
        };
      }

      if (!code && !accessToken) {
        setIsLoading(false);
        return {
          error: new Error(
            `Missing auth credentials from callback (redirectTo: ${redirectTo}). Verify Supabase redirect URLs include blogapp://auth/callback and exp://*/--/auth/callback, and set Supabase Site URL to a real URL (not localhost).`,
          ),
        };
      }

      setIsLoading(false);
      return {
        error: new Error("Google sign-in did not complete. Please try again."),
      };
    } catch (error) {
      setIsLoading(false);
      return { error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      // Immediately clear session and redirect to landing page
      setSession(null);
      setIsLoading(false);
      try {
        const { router } = await import("expo-router");
        router.replace("/landing-page");
      } catch {
        if (typeof window !== "undefined") {
          window.location.href = "/landing-page";
        }
      }
    } catch {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      session,
      isLoading,
      signInWithGoogle,
      signOut,
    }),
    [isLoading, session, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
