import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

export default function LegacyPublicPostRedirect() {
  const { username, id } = useLocalSearchParams<{
    username?: string | string[];
    id?: string | string[];
  }>();

  useEffect(() => {
    const resolvedUsername = Array.isArray(username) ? username[0] : username;
    const resolvedId = Array.isArray(id) ? id[0] : id;

    if (!resolvedUsername || !resolvedId) {
      return;
    }

    router.replace({
      pathname: "/blog-view/[username]/post/[id]",
      params: { username: resolvedUsername, id: resolvedId },
    });
  }, [id, username]);

  return null;
}
