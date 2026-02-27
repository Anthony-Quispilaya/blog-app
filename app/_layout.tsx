import { Mate_400Regular } from "@expo-google-fonts/mate";
import { Questrial_400Regular } from "@expo-google-fonts/questrial";
import {
  SourceSansPro_400Regular,
  SourceSansPro_600SemiBold,
  SourceSansPro_700Bold,
} from "@expo-google-fonts/source-sans-pro";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { router, Stack, usePathname, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";

import { FONT_FAMILIES, palettes } from "@/constants/editorial";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AppThemeProvider, useAppTheme } from "@/lib/theme-context";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    [FONT_FAMILIES.display]: Questrial_400Regular,
    [FONT_FAMILIES.heading]: Mate_400Regular,
    [FONT_FAMILIES.body]: SourceSansPro_400Regular,
    [FONT_FAMILIES.bodySemiBold]: SourceSansPro_600SemiBold,
    [FONT_FAMILIES.bodyBold]: SourceSansPro_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palettes.dark.background,
        }}
      >
        <ActivityIndicator color={palettes.dark.textPrimary} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <AppThemeProvider>
        <RootNavigator />
      </AppThemeProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { colors, mode, isHydrated } = useAppTheme();
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const lastNavRef = useRef<string>("");

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const topSegment = segments[0];
    const isInHome = topSegment === "home";
    const isInPrivatePost = topSegment === "post";
    const isInAuthOnlyArea = isInHome || isInPrivatePost;

    const isPublicLanding = pathname === "/" || pathname === "/landing-page";
    const isLogin = pathname === "/login";

    // Logged out users should never remain in auth-only areas.
    if (!session && isInAuthOnlyArea) {
      if (lastNavRef.current !== "logout:/landing-page") {
        lastNavRef.current = "logout:/landing-page";
        router.replace("/landing-page");
      }
      return;
    }

    // Logged in users on landing/login should go to their dashboard.
    if (session && (isPublicLanding || isLogin)) {
      if (lastNavRef.current !== "login:/home") {
        lastNavRef.current = "login:/home";
        router.replace("/home");
      }
      return;
    }

    // Clear guard key once we're in a stable area.
    lastNavRef.current = "";
  }, [isLoading, pathname, segments, session]);

  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  const navigationTheme = {
    ...(mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.textPrimary,
      border: colors.divider,
      notification: colors.accent,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="landing-page" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="blog-view" options={{ headerShown: false }} />
        <Stack.Screen name="u/[username]" options={{ headerShown: false }} />
        <Stack.Screen
          name="u/[username]/post/[id]"
          options={{ headerShown: false }}
        />
      </Stack>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
