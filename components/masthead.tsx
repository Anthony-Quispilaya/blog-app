import { Platform, Pressable, StyleSheet, View } from "react-native";

import { TextBody, TextDisplay } from "@/components/typography";
import { spacing } from "@/constants/editorial";
import { useAppTheme } from "@/lib/theme-context";

export function Masthead() {
  const { colors, mode, toggleMode } = useAppTheme();

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.sideSpacer} />
        <TextDisplay style={styles.title}>EasyBlog AI</TextDisplay>
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
  title: {
    textAlign: "center",
    fontSize: 26,
    lineHeight: 30,
    flex: 1,
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
