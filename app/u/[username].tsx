import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

export default function LegacyPublicUserRedirect() {
  const { username } = useLocalSearchParams<{ username?: string | string[] }>();

  useEffect(() => {
    const resolvedUsername = Array.isArray(username) ? username[0] : username;
    if (!resolvedUsername) {
      return;
    }

    router.replace({
      pathname: "/blog-view/[username]",
      params: { username: resolvedUsername },
    });
  }, [username]);

  return null;
}
