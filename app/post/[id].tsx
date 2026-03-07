import { useFocusEffect } from "@react-navigation/native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { Reveal } from "@/components/motion/reveal";
import {
  MotionScrollView,
  ScrollMotionProvider,
} from "@/components/motion/scroll-context";

import { ScreenContainer } from "@/components/screen-container";
import {
  TextBody,
  TextDisplay,
  TextHeading,
  TextMeta,
} from "@/components/typography";
import { spacing } from "@/constants/editorial";
import { useAuth } from "@/lib/auth-context";
import { fetchPostById } from "@/lib/posts";
import { useAppTheme } from "@/lib/theme-context";
import type { BlogPost } from "@/types/post";
import { formatDate } from "@/utils/formatDate";

export default function PostDetailScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPost = useCallback(async () => {
    if (!params.id) {
      setIsLoading(false);
      return;
    }

    if (!session?.user.id) {
      setPost(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const loadedPost = await fetchPostById(params.id, session.user.id);
      setPost(loadedPost);
    } finally {
      setIsLoading(false);
    }
  }, [params.id, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadPost();
      return;
    }, [loadPost]),
  );

  if (!session) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer center withMasthead={false}>
        <TextMeta>Loading article…</TextMeta>
      </ScreenContainer>
    );
  }

  if (!post) {
    return (
      <ScreenContainer center withMasthead={false}>
        <TextDisplay style={styles.notFoundTitle}>Post not found</TextDisplay>
        <TextBody
          style={[styles.notFoundSubtitle, { color: colors.textMuted }]}
        >
          The selected article does not exist.
        </TextBody>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollMotionProvider>
        <MotionScrollView
          stickyHeaderIndices={[0]}
          contentContainerStyle={[styles.container, { alignItems: "stretch" }]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.stickyHeader,
              {
                backgroundColor: colors.background,
                borderBottomColor: colors.divider,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                    return;
                  }
                  router.replace("/home");
                }}
                style={({ pressed, hovered }) => [
                  styles.backButton,
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
              >
                <TextBody style={styles.backText}>← Back to Home</TextBody>
              </Pressable>

              <View style={{ flex: 1 }} />

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/post/edit/[id]",
                    params: { id: String(params.id) },
                  })
                }
                style={({ pressed, hovered }) => [
                  styles.editButton,
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
              >
                <TextBody style={styles.backText}>Edit</TextBody>
              </Pressable>
            </View>
          </View>

          <Reveal offsetY={14} blurPx={10}>
            <View style={styles.articleWrap}>
              <TextHeading style={styles.title}>{post.title}</TextHeading>
              <TextMeta style={styles.meta}>
                By {post.authorName} • {formatDate(post.createdAt)}
              </TextMeta>
              <View
                style={[styles.divider, { backgroundColor: colors.divider }]}
              />
              <TextBody style={styles.body}>{post.content}</TextBody>
            </View>
          </Reveal>
        </MotionScrollView>
      </ScrollMotionProvider>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  articleWrap: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    marginTop: spacing.lg,
  },
  stickyHeader: {
    width: "100%",
    alignSelf: "stretch",
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  backButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  editButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 15,
    lineHeight: 20,
  },
  title: {
    fontSize: 40,
    lineHeight: 48,
    marginBottom: spacing.md,
    flexShrink: 1,
    width: "100%",
  },
  meta: {
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    marginBottom: spacing.lg,
  },
  body: {
    fontSize: 18,
    lineHeight: 32,
    flexShrink: 1,
    width: "100%",
  },
  notFoundTitle: {
    fontSize: 28,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  notFoundSubtitle: {
    fontSize: 15,
    textAlign: "center",
  },
});
