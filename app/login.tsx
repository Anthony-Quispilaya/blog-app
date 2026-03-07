import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { TextBodyStrong, TextMeta } from "@/components/typography";
import { spacing } from "@/constants/editorial";
import { useAuth } from "@/lib/auth-context";
import { useAppTheme } from "@/lib/theme-context";

export default function LoginScreen() {
  const { session, isLoading, signInWithGoogle } = useAuth();
  const { colors, mode } = useAppTheme();

  const logoSource =
    mode === "dark"
      ? require("../assets/images/darkmode_logo.png")
      : require("../assets/images/lightmode_logo.png");

  if (!isLoading && session) {
    return null;
  }

  const onGooglePress = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      Alert.alert("Google sign-in failed", error.message);
    }
  };

  return (
    <ScreenContainer center withMasthead={false}>
      <View style={styles.content}>
        <Image
          source={logoSource}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="EasyBlog AI"
        />
        <TextMeta style={styles.tagline}>
          Simple publishing, beautifully presented.
        </TextMeta>

        <View style={[styles.rule, { backgroundColor: colors.divider }]} />

        <Pressable
          style={({ pressed, hovered }) => [
            styles.primaryButton,
            {
              backgroundColor: colors.accent,
              opacity: pressed ? 0.88 : 1,
              borderColor: hovered ? colors.textPrimary : colors.accent,
              transform: [{ translateY: hovered ? -1 : 0 }],
            },
            Platform.OS === "web"
              ? ({
                  cursor: isLoading ? "auto" : "pointer",
                  transitionProperty: "transform, opacity, border-color",
                  transitionDuration: "140ms",
                  transitionTimingFunction: "ease-out",
                } as any)
              : null,
          ]}
          onPress={onGooglePress}
          disabled={isLoading}
        >
          <TextBodyStrong
            style={[styles.primaryButtonText, { color: colors.background }]}
          >
            Continue with Google
          </TextBodyStrong>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.textPrimary} />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    alignItems: "stretch",
    paddingHorizontal: 24,
  },
  logo: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 260,
    height: 84,
    marginTop: 8,
    marginBottom: 8,
  },
  tagline: {
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  rule: {
    height: 1,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
  },
  secondaryButton: {
    width: "100%",
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 2,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
  },
  loader: {
    marginTop: 24,
  },
});
