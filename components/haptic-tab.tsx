import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { Platform, StyleSheet } from "react-native";

import { spacing } from "@/constants/editorial";

export function HapticTab(props: BottomTabBarButtonProps) {
  const incomingStyle = (props as any).style;

  return (
    <PlatformPressable
      {...props}
      style={
        ((state: any) => {
          const { pressed, hovered, focused } = state;
          return [
            styles.base,
            typeof incomingStyle === "function"
              ? incomingStyle({ pressed, hovered, focused })
              : incomingStyle,
            Platform.OS === "web"
              ? ({
                  cursor: "pointer",
                  userSelect: "none",
                  transitionProperty: "transform, opacity",
                  transitionDuration: "160ms",
                  transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
                } as any)
              : null,
            {
              opacity: pressed ? 0.82 : 1,
              transform: [{ translateY: hovered ? -1 : 0 }],
            },
          ];
        }) as unknown as any
      }
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
});
