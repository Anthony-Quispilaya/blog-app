import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { clamp, useAnimatedStyle } from "react-native-reanimated";

import { Reveal } from "@/components/motion/reveal";
import {
  MotionScrollView,
  ScrollMotionProvider,
  useScrollY,
} from "@/components/motion/scroll-context";
import { PostCard } from "@/components/post-card";
import { ScreenContainer } from "@/components/screen-container";
import {
  TextBody,
  TextBodyStrong,
  TextDisplay,
  TextMeta,
} from "@/components/typography";
import { FONT_FAMILIES, spacing } from "@/constants/editorial";
import { fetchPublicPostsByUsername } from "@/lib/posts";
import {
  fetchPublicProfileByUsername,
  type PublicProfile,
} from "@/lib/profiles";
import { useAppTheme } from "@/lib/theme-context";
import type { BlogPost } from "@/types/post";

export default function PublicUserFeedScreen() {
  const { username } = useLocalSearchParams<{ username: string | string[] }>();
  const { colors } = useAppTheme();

  const resolvedUsername = useMemo(() => {
    const raw = Array.isArray(username) ? username[0] : username;
    return (raw ?? "").trim();
  }, [username]);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const injectedCssRef = useRef<string>("");

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }

    const css = `
      /* Public creator page scrollbar */
      #public-blog-scroll {
        scrollbar-width: thin;
        scrollbar-color: ${colors.divider} transparent;
      }

      #public-blog-scroll::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }

      #public-blog-scroll::-webkit-scrollbar-track {
        background: transparent;
      }

      #public-blog-scroll::-webkit-scrollbar-thumb {
        background-color: ${colors.divider};
        border-radius: 999px;
        border: 3px solid transparent;
        background-clip: content-box;
      }

      #public-blog-scroll::-webkit-scrollbar-thumb:hover {
        background-color: ${colors.textMuted};
      }
    `.trim();

    if (injectedCssRef.current === css) {
      return;
    }
    injectedCssRef.current = css;

    const styleTagId = "public-blog-scrollbar-style";
    const existing = document.getElementById(styleTagId);
    if (existing) {
      existing.textContent = css;
      return;
    }

    const tag = document.createElement("style");
    tag.id = styleTagId;
    tag.textContent = css;
    document.head.appendChild(tag);
  }, [colors.divider, colors.textMuted]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!resolvedUsername) {
        setProfile(null);
        setIsLoadingProfile(false);
        return;
      }

      try {
        setIsLoadingProfile(true);
        const loadedProfile =
          await fetchPublicProfileByUsername(resolvedUsername);
        setProfile(loadedProfile);
      } catch {
        setProfile(null);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [resolvedUsername]);

  useEffect(() => {
    const load = async () => {
      if (!resolvedUsername) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const userPosts = await fetchPublicPostsByUsername(resolvedUsername);
        setPosts(userPosts);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [resolvedUsername]);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return posts;
    }

    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(query) ||
        post.authorName.toLowerCase().includes(query),
    );
  }, [posts, searchQuery]);

  return (
    <ScreenContainer>
      <ScrollMotionProvider>
        <PublicUserFeedScroll
          resolvedUsername={resolvedUsername}
          profile={profile}
          isLoadingProfile={isLoadingProfile}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isLoading={isLoading}
          filteredPosts={filteredPosts}
        />
      </ScrollMotionProvider>
    </ScreenContainer>
  );
}

function PublicUserFeedScroll({
  resolvedUsername,
  profile,
  isLoadingProfile,
  searchQuery,
  setSearchQuery,
  isLoading,
  filteredPosts,
}: {
  resolvedUsername: string;
  profile: PublicProfile | null;
  isLoadingProfile: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isLoading: boolean;
  filteredPosts: BlogPost[];
}) {
  const scrollY = useScrollY();
  const { colors } = useAppTheme();

  const headerMotion = useAnimatedStyle(() => {
    const easeOutCubic = (t: number) => {
      "worklet";
      return 1 - Math.pow(1 - t, 3);
    };

    const t = clamp(scrollY.value / 640, 0, 1);
    const eased = easeOutCubic(t);

    const opacity = 1 - 0.06 * eased;
    const translateY = -10 * eased;
    const scale = 1 - 0.01 * eased;

    const base: any = {
      opacity,
      transform: [{ translateY }, { scale }],
    };

    if (Platform.OS === "web") {
      base.willChange = "transform, opacity";
    }

    return base;
  });

  const searchMotion = useAnimatedStyle(() => {
    const easeOutCubic = (t: number) => {
      "worklet";
      return 1 - Math.pow(1 - t, 3);
    };

    const t = clamp(scrollY.value / 760, 0, 1);
    const eased = easeOutCubic(t);

    const opacity = 1 - 0.05 * eased;
    const translateY = -8 * eased;

    const base: any = {
      opacity,
      transform: [{ translateY }],
    };

    if (Platform.OS === "web") {
      base.willChange = "transform, opacity";
    }

    return base;
  });

  return (
    <MotionScrollView
      nativeID={Platform.OS === "web" ? "public-blog-scroll" : undefined}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <Animated.View
        style={[
          styles.headerCard,
          headerMotion,
          {
            borderColor: colors.divider,
            backgroundColor: colors.inputBackground,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={[styles.avatar, { backgroundColor: colors.surface }]}
            />
          ) : (
            <View
              style={[styles.avatar, { backgroundColor: colors.surface }]}
            />
          )}

          <View style={styles.headerTextCol}>
            {isLoadingProfile ? (
              <View style={styles.profileLoadingRow}>
                <ActivityIndicator color={colors.textPrimary} />
                <TextMeta>Loading creator…</TextMeta>
              </View>
            ) : profile?.display_name ? (
              <TextDisplay style={styles.creatorName}>
                {profile.display_name}
              </TextDisplay>
            ) : (
              <TextDisplay style={styles.creatorName}>Creator</TextDisplay>
            )}

            <View style={styles.handleRow}>
              <TextBodyStrong style={styles.handleText}>
                @{resolvedUsername || ""}
              </TextBodyStrong>
            </View>

            <TextMeta style={[styles.subheading, { color: colors.textMuted }]}>
              Public posts
            </TextMeta>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={searchMotion}>
        <TextInput
          placeholder="Search posts"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          selectionColor={colors.accent}
          style={[
            styles.searchInput,
            {
              color: colors.textPrimary,
              borderBottomColor: colors.divider,
              backgroundColor: colors.inputBackground,
            },
          ]}
        />
      </Animated.View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      ) : null}

      {!isLoading && filteredPosts.length === 0 ? (
        <TextBody style={[styles.emptyText, { color: colors.textMuted }]}>
          No public posts yet.
        </TextBody>
      ) : null}

      {filteredPosts.map((post, index) => (
        <Reveal key={post.id} offsetY={index === 0 ? 14 : 18} blurPx={10}>
          <PostCard
            post={post}
            featured={index === 0}
            linkTo={{
              pathname: "/blog-view/[username]/post/[id]",
              params: {
                username: String(resolvedUsername),
                id: post.id,
              },
            }}
          />
        </Reveal>
      ))}
    </MotionScrollView>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    borderWidth: 1,
    borderRadius: 2,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  profileLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 2,
  },
  creatorName: {
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 2,
  },
  handleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 4,
  },
  handleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  subheading: {
    marginBottom: 0,
  },
  searchInput: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    fontFamily: FONT_FAMILIES.body,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  loadingWrap: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
