import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import {
    TextBody,
    TextBodyStrong,
    TextDisplay,
    TextHeading,
    TextMeta,
} from "@/components/typography";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FONT_FAMILIES, spacing } from "@/constants/editorial";
import { useAuth } from "@/lib/auth-context";
import { deletePost, fetchPostById, updatePost } from "@/lib/posts";
import { useAppTheme } from "@/lib/theme-context";
import type { BlogPost } from "@/types/post";

export default function EditPostScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { colors } = useAppTheme();

  const postId = String(params.id || "");

  const [post, setPost] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = Boolean(session?.user.id && postId);

  const load = useCallback(async () => {
    if (!canEdit) {
      setIsLoading(false);
      setPost(null);
      return;
    }

    try {
      setIsLoading(true);
      const loaded = await fetchPostById(postId, session!.user.id);
      setPost(loaded);
      setTitle(loaded?.title ?? "");
      setContent(loaded?.content ?? "");
    } catch (error) {
      Alert.alert("Unable to load post", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [canEdit, postId, session]);

  useEffect(() => {
    void load();
  }, [load]);

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  const hasChanges = Boolean(
    post &&
    (trimmedTitle !== (post.title ?? "").trim() ||
      trimmedContent !== (post.content ?? "").trim()),
  );

  const onSave = async () => {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in to edit posts.");
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updatePost({
        postId,
        userId: session.user.id,
        title,
        content,
      });
      setPost(updated);

      // Return to the post detail screen; it refetches on focus.
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace({ pathname: "/post/[id]", params: { id: postId } });
      }
    } catch (error) {
      Alert.alert("Save failed", (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const onCancel = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace({ pathname: "/post/[id]", params: { id: postId } });
  };

  const onDelete = async () => {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in to delete posts.");
      return;
    }

    try {
      setIsDeleting(true);
      await deletePost({ postId, userId: session.user.id });
      setIsConfirmingDelete(false);

      // Go back to the dashboard feed; it refetches on focus.
      router.replace("/home");
    } catch (error) {
      Alert.alert("Delete failed", (error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!session) {
    return (
      <ScreenContainer center withMasthead={false}>
        <TextMeta>Sign in to edit posts.</TextMeta>
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer center withMasthead={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.textPrimary} />
      </ScreenContainer>
    );
  }

  if (!post) {
    return (
      <ScreenContainer center withMasthead={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <TextDisplay style={styles.notFoundTitle}>Post not found</TextDisplay>
        <TextBody
          style={[styles.notFoundSubtitle, { color: colors.textMuted }]}
        >
          The selected article does not exist, or you do not have permission to
          edit it.
        </TextBody>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/home")}
          style={({ pressed, hovered }) => [
            styles.secondaryButton,
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
          <TextBodyStrong style={styles.secondaryButtonText}>
            Back to Home
          </TextBodyStrong>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed, hovered }) => [
            styles.headerButton,
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
          <TextBody style={styles.headerButtonText}>← Cancel</TextBody>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable
          accessibilityRole="button"
          disabled={isSaving || !hasChanges}
          onPress={onSave}
          style={({ pressed, hovered }) => [
            styles.primaryHeaderButton,
            {
              backgroundColor: colors.accent,
              borderColor: hovered ? colors.textPrimary : colors.accent,
              opacity: isSaving || !hasChanges ? 0.6 : pressed ? 0.88 : 1,
              transform: [{ translateY: hovered ? -1 : 0 }],
            },
            Platform.OS === "web"
              ? ({
                  cursor: isSaving || !hasChanges ? "auto" : "pointer",
                  transitionProperty: "transform, opacity, border-color",
                  transitionDuration: "140ms",
                  transitionTimingFunction: "ease-out",
                } as any)
              : null,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <TextBodyStrong
              style={[
                styles.primaryHeaderButtonText,
                { color: colors.background },
              ]}
            >
              Save
            </TextBodyStrong>
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formWrap}>
          <TextHeading style={styles.title}>Edit post</TextHeading>
          <TextMeta style={styles.subtitle}>
            Update the title and body, then save.
          </TextMeta>

          <TextMeta style={styles.label}>Title</TextMeta>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Post title"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderBottomColor: colors.divider,
                backgroundColor: colors.inputBackground,
              },
            ]}
            returnKeyType="next"
            blurOnSubmit={false}
          />

          <TextMeta style={styles.label}>Body</TextMeta>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Write your post…"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            multiline
            textAlignVertical="top"
            style={[
              styles.textarea,
              {
                color: colors.textPrimary,
                borderColor: colors.divider,
                backgroundColor: colors.inputBackground,
              },
            ]}
          />

          <View style={[styles.rule, { backgroundColor: colors.divider }]} />

          <View
            style={[
              styles.dangerZone,
              { borderColor: colors.divider, backgroundColor: "transparent" },
            ]}
          >
            <TextBodyStrong style={styles.dangerTitle}>
              Danger zone
            </TextBodyStrong>
            <TextMeta style={styles.dangerText}>
              Deleting a post is irreversible and will permanently remove it
              from Supabase.
            </TextMeta>

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsConfirmingDelete(true)}
              style={({ pressed, hovered }) => [
                styles.secondaryButton,
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
              <TextBodyStrong
                style={[styles.deleteButtonText, { color: colors.textPrimary }]}
              >
                Delete post
              </TextBodyStrong>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={isConfirmingDelete}
        title="Delete this post?"
        message="This action is irreversible. This post will be permanently deleted and removed from the Supabase database."
        confirmLabel={isDeleting ? "Deleting…" : "Delete permanently"}
        onCancel={() => {
          if (!isDeleting) setIsConfirmingDelete(false);
        }}
        onConfirm={onDelete}
        confirmDisabled={isDeleting}
      >
        <TextMeta style={{ color: colors.textMuted }}>
          You can’t undo this.
        </TextMeta>
      </ConfirmDialog>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  headerButton: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  headerButtonText: {
    fontSize: 15,
    lineHeight: 20,
  },
  primaryHeaderButton: {
    minWidth: 110,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryHeaderButtonText: {
    fontSize: 15,
  },
  formWrap: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingBottom: spacing.xl,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: spacing.lg,
    fontFamily: FONT_FAMILIES.body,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 220,
    lineHeight: 24,
    fontFamily: FONT_FAMILIES.body,
  },
  rule: {
    height: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  dangerZone: {
    borderWidth: 1,
    borderRadius: 2,
    padding: spacing.md,
    gap: spacing.xs,
  },
  dangerTitle: {
    fontSize: 16,
  },
  dangerText: {
    marginBottom: spacing.sm,
  },
  secondaryButton: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 2,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  notFoundTitle: {
    fontSize: 28,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  notFoundSubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: spacing.md,
  },
});
