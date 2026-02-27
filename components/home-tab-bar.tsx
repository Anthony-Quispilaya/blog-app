import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TextMeta } from "@/components/typography";
import { FONT_FAMILIES, spacing } from "@/constants/editorial";

type HomeTabBarProps = BottomTabBarProps & {
  activeTintColor: string;
  inactiveTintColor: string;
  backgroundColor: string;
  borderColor: string;
};

export function HomeTabBar({
  state,
  descriptors,
  navigation,
  activeTintColor,
  inactiveTintColor,
  backgroundColor,
  borderColor,
}: HomeTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor,
          borderTopColor: borderColor,
          paddingBottom: Math.max(insets.bottom, spacing.xs),
        },
      ]}
    >
      <View
        style={[
          styles.row,
          Platform.OS === "web" ? styles.rowWeb : styles.rowNative,
        ]}
      >
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const options = descriptor?.options ?? {};
          const isFocused = state.index === index;

          const label =
            (typeof options.tabBarLabel === "string" && options.tabBarLabel) ||
            (typeof options.title === "string" && options.title) ||
            route.name;

          const color = isFocused ? activeTintColor : inactiveTintColor;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              onPressIn={() => {
                if (process.env.EXPO_OS === "ios") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={({ pressed, hovered }) => [
                styles.item,
                Platform.OS === "web"
                  ? ({
                      cursor: "pointer",
                      userSelect: "none",
                      transitionProperty: "transform, opacity",
                      transitionDuration: "160ms",
                      transitionTimingFunction:
                        "cubic-bezier(0.2, 0.8, 0.2, 1)",
                    } as any)
                  : null,
                {
                  opacity: pressed ? 0.82 : 1,
                  transform: [{ translateY: hovered ? -1 : 0 }],
                },
              ]}
            >
              <View style={styles.itemInner}>
                {typeof options.tabBarIcon === "function"
                  ? options.tabBarIcon({
                      focused: isFocused,
                      color,
                      size: 26,
                    })
                  : null}

                <TextMeta
                  style={[
                    styles.label,
                    {
                      fontFamily: FONT_FAMILIES.bodySemiBold,
                      color,
                    },
                  ]}
                >
                  {label}
                </TextMeta>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    paddingTop: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  rowNative: {
    justifyContent: "center",
    gap: spacing.xl + spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  rowWeb: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
  },
  item: {
    borderRadius: 999,
    minWidth: spacing.xl * 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
});
