import { supabase, supabaseAnon } from "@/lib/supabaseClient";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type PublicProfile = Pick<
  ProfileRow,
  "username" | "display_name" | "avatar_url"
>;

export async function fetchPublicProfileByUsername(username: string) {
  const normalized = username.trim();
  if (!normalized) {
    return null;
  }

  const { data, error } = await supabaseAnon
    .from("profiles")
    .select("username,display_name,avatar_url")
    .eq("username", normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PublicProfile | null) ?? null;
}

export async function getOrCreateProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const { data: existing, error } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (existing?.username) {
    return existing as ProfileRow;
  }

  const usernameSeed =
    (
      (user.user_metadata?.preferred_username as string | undefined) ||
      (user.email?.split("@")[0] ?? "writer")
    )
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 20) || "writer";

  const fallbackUsername = `${usernameSeed}_${user.id.slice(0, 6)}`;

  const { data: inserted, error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        username: fallbackUsername,
        display_name:
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          user.email ||
          "Writer",
        avatar_url:
          (user.user_metadata?.avatar_url as string | undefined) || null,
      },
      { onConflict: "id" },
    )
    .select("id,username,display_name,avatar_url")
    .single();

  if (upsertError) {
    throw upsertError;
  }

  return inserted as ProfileRow;
}

export function buildPublicProfileUrl(username: string) {
  const runtimeOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";

  const configuredBaseUrl = (process.env.EXPO_PUBLIC_WEB_URL || "").trim();
  const baseUrl = runtimeOrigin || configuredBaseUrl || "http://localhost:8081";

  return `${baseUrl.replace(/\/$/, "")}/blog-view/${username}`;
}
