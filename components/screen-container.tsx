import { PropsWithChildren } from "react";
import {
    SafeAreaView,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";

import { Masthead } from "@/components/masthead";
import { spacing } from "@/constants/editorial";
import { useAppTheme } from "@/lib/theme-context";

type ScreenContainerProps = PropsWithChildren<{
  center?: boolean;
  withMasthead?: boolean;
}>;

export function ScreenContainer({
  children,
  center = false,
  withMasthead = true,
}: ScreenContainerProps) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - spacing.md * 2, 1120);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={[styles.outer, center && styles.center]}>
        <View style={[styles.container, { width: contentWidth }]}>
          {withMasthead ? <Masthead /> : null}
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  outer: {
    flex: 1,
    alignItems: "center",
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  center: {
    justifyContent: "center",
  },
});
