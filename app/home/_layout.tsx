import { Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { HomeTabBar } from "@/components/home-tab-bar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/lib/auth-context";
import { useAppTheme } from "@/lib/theme-context";

export default function HomeTabLayout() {
  const { session, isLoading } = useAuth();
  const { colors } = useAppTheme();

  if (isLoading || !session) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <Tabs
      tabBar={(props) => (
        <HomeTabBar
          {...props}
          activeTintColor={colors.accent}
          inactiveTintColor={colors.textMuted}
          backgroundColor={colors.background}
          borderColor={colors.divider}
        />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
