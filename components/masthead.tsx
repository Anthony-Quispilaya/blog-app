import { Image, Platform, Pressable, StyleSheet, View } from "react-native";

import { TextBody } from "@/components/typography";
import { spacing } from "@/constants/editorial";
import { useAppTheme } from "@/lib/theme-context";

export function Masthead() {
  const { colors, mode, toggleMode } = useAppTheme();

  const logoSource =
    mode === "dark"
      ? require("../assets/images/darkmode_logo.png")
      : require("../assets/images/lightmode_logo.png");

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.sideSpacer} />
        <View style={styles.logoWrap}>
          <Image
            source={logoSource}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="EasyBlog AI"
          />
        </View>
        <View style={styles.rightGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle theme"
            onPress={toggleMode}
            style={({ pressed, hovered }) => [
              styles.themeToggle,
              {
                borderColor: colors.divider,
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
                    userSelect: "none",
                  } as any)
                : null,
            ]}
          >
            <TextBody style={styles.navText}>
              {mode === "dark" ? "Light" : "Dark"}
            </TextBody>
          </Pressable>
        </View>
      </View>
      <View style={[styles.rule, { backgroundColor: colors.divider }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  logoWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "100%",
    maxWidth: 260,
    height: 84,
  },
  sideSpacer: {
    width: 58,
  },
  navText: {
    fontSize: 14,
    lineHeight: 18,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  themeToggle: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  rule: {
    height: 1,
  },
});
