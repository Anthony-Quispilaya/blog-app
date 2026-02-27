import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { TextBodyStrong, TextDisplay, TextMeta } from "@/components/typography";
import { spacing } from "@/constants/editorial";
import { useAuth } from "@/lib/auth-context";
import { buildPublicProfileUrl, getOrCreateProfile } from "@/lib/profiles";
import { useAppTheme } from "@/lib/theme-context";

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { colors } = useAppTheme();
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const user = session?.user;

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        return;
      }

      try {
        const profile = await getOrCreateProfile({
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
        });

        if (profile.username) {
          setPublicUrl(buildPublicProfileUrl(profile.username));
        }
      } catch {
        setPublicUrl(null);
      }
    };

    loadProfile();
  }, [user]);

  if (!session) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    "User";

  return (
    <ScreenContainer center withMasthead={false}>
      <View style={styles.section}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.surface }]} />
        )}
        <TextDisplay style={styles.title}>{fullName}</TextDisplay>
        <TextMeta style={styles.email}>{user?.email}</TextMeta>

        {publicUrl ? (
          <TextMeta style={styles.urlText}>{publicUrl}</TextMeta>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        {publicUrl ? (
          <Pressable
            style={({ pressed, hovered }) => [
              styles.secondaryButton,
              {
                borderColor: hovered ? colors.textMuted : colors.divider,
                backgroundColor:
                  pressed || hovered ? colors.overlay : "transparent",
                opacity: pressed ? 0.92 : 1,
                transform: [{ translateY: hovered ? -1 : 0 }],
              },
              Platform.OS === "web"
                ? ({
                    cursor: "pointer",
                    transitionProperty:
                      "transform, background-color, opacity, border-color",
                    transitionDuration: "140ms",
                    transitionTimingFunction: "ease-out",
                  } as any)
                : null,
            ]}
            onPress={async () => {
              await Clipboard.setStringAsync(publicUrl);
            }}
          >
            <TextBodyStrong
              style={[styles.buttonText, { color: colors.textPrimary }]}
            >
              Copy Public Link
            </TextBodyStrong>
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed, hovered }) => [
            styles.button,
            {
              backgroundColor: colors.accent,
              opacity: pressed ? 0.88 : 1,
              borderColor: hovered ? colors.textPrimary : colors.accent,
              transform: [{ translateY: hovered ? -1 : 0 }],
            },
            Platform.OS === "web"
              ? ({
                  cursor: "pointer",
                  transitionProperty: "transform, opacity, border-color",
                  transitionDuration: "140ms",
                  transitionTimingFunction: "ease-out",
                } as any)
              : null,
          ]}
          onPress={signOut}
        >
          <TextBodyStrong
            style={[styles.buttonText, { color: colors.background }]}
          >
            Logout
          </TextBodyStrong>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    alignItems: "center",
    maxWidth: 760,
    alignSelf: "center",
    width: "100%",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 38,
    lineHeight: 44,
    marginBottom: 6,
    textAlign: "center",
  },
  email: {
    marginBottom: spacing.md,
    textAlign: "center",
  },
  urlText: {
    marginBottom: spacing.md,
    textAlign: "center",
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: spacing.lg,
  },
  secondaryButton: {
    width: "100%",
    maxWidth: 240,
    borderRadius: 2,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  button: {
    width: "100%",
    maxWidth: 240,
    borderRadius: 2,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
  },
});
