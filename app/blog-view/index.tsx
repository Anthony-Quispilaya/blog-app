import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { TextBody, TextDisplay, TextMeta } from "@/components/typography";
import { spacing } from "@/constants/editorial";
import { useAppTheme } from "@/lib/theme-context";

export default function BlogViewIndex() {
  const { colors } = useAppTheme();

  return (
    <ScreenContainer center withMasthead={false}>
      <Stack.Screen options={{ title: "Blog" }} />
      <View style={styles.wrap}>
        <TextDisplay style={styles.title}>Shared link required</TextDisplay>
        <TextMeta style={[styles.meta, { color: colors.textMuted }]}>
          Public posts are accessed through a creator’s shared link.
        </TextMeta>
        <TextBody style={{ color: colors.textPrimary }}>
          {"/blog-view/<username>"}
        </TextBody>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: 560,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  meta: {
    textAlign: "center",
    marginBottom: spacing.sm,
  },
});
