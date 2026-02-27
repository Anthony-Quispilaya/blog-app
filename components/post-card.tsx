import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { TextBody, TextHeading, TextMeta } from "@/components/typography";
import { spacing } from "@/constants/editorial";
import { useAppTheme } from "@/lib/theme-context";
import type { BlogPost } from "@/types/post";
import { formatDate } from "@/utils/formatDate";
import { getExcerpt } from "@/utils/getExcerpt";

type PostCardProps = {
  post: BlogPost;
  featured?: boolean;
  linkTo?: Href;
};

export function PostCard({ post, featured = false, linkTo }: PostCardProps) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);

  const headingSize = featured ? styles.featuredTitle : styles.title;
  const excerptSize = featured ? styles.featuredExcerpt : styles.excerpt;

  return (
    <Pressable
      accessibilityRole="button"
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={({ pressed, hovered }) => [
        styles.row,
        Platform.OS === "web"
          ? {
              cursor: "pointer",
              userSelect: "none",
              outlineStyle: "solid",
              outlineWidth: 0,
              transitionProperty:
                "transform, opacity, background-color, border-color",
              transitionDuration: "140ms",
              transitionTimingFunction: "ease",
            }
          : null,
        {
          backgroundColor: pressed || hovered ? colors.overlay : "transparent",
          borderColor: hovered || isFocused ? colors.divider : "transparent",
          transform: [
            {
              translateY: hovered ? -1 : 0,
            },
          ],
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      onPress={() =>
        router.push(
          linkTo ?? { pathname: "/post/[id]", params: { id: post.id } },
        )
      }
    >
      <TextHeading style={headingSize}>{post.title}</TextHeading>
      <TextMeta style={styles.meta}>
        {post.authorName} • {formatDate(post.createdAt)}
      </TextMeta>
      <View style={styles.spacer} />
      <TextBody style={excerptSize}>
        {getExcerpt(post.content, featured ? 220 : 180)}
      </TextBody>
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 29,
    lineHeight: 34,
  },
  featuredTitle: {
    fontSize: 40,
    lineHeight: 46,
  },
  meta: {
    marginTop: 8,
  },
  spacer: {
    height: spacing.sm,
  },
  excerpt: {
    fontSize: 18,
    lineHeight: 29,
  },
  featuredExcerpt: {
    fontSize: 19,
    lineHeight: 31,
  },
  divider: {
    marginTop: spacing.lg,
    height: 1,
  },
});
