import { router } from "expo-router";
import { useMemo } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
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
  TextBodyStrong,
  TextDisplay,
  TextHeading,
  TextMeta,
} from "@/components/typography";
import { spacing } from "@/constants/editorial";
import { useAppTheme } from "@/lib/theme-context";

export default function LandingPage() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;

  const featureItems = useMemo(
    () => [
      {
        title: "Record, don’t write",
        body: "Speak naturally. Your voice becomes a polished blog post — without starting from a blank page.",
      },
      {
        title: "AI-generated title + structure",
        body: "No more staring at ‘Untitled’. We generate a title and organize your thoughts into readable sections.",
      },
      {
        title: "Edit anytime",
        body: "Prefer more control? You can still refine and tweak your post after it’s generated.",
      },
      {
        title: "Free to start",
        body: "Log in with Google and publish your first voice post in minutes.",
      },
    ],
    [],
  );

  return (
    <ScreenContainer withMasthead>
      <ScrollMotionProvider>
        <MotionScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.centerWrap}>
            <View style={styles.content}>
              <Reveal offsetY={12} blurPx={8}>
                <TextMeta style={[styles.kicker, { color: colors.textMuted }]}>
                  Welcome to your automated blog website.
                </TextMeta>
                <TextDisplay style={styles.heroTitle}>
                  Speak your post.
                  {"\n"}
                  AI publishes it.
                </TextDisplay>
                <TextBody
                  style={[styles.heroSubtitle, { color: colors.textPrimary }]}
                >
                  Creators shouldn’t have to type everything, invent titles, and
                  wrestle with structure.
                  {"\n"}
                  Open the app, press record, speak naturally — and get a clean,
                  readable blog post in minutes.
                </TextBody>

                <View
                  style={[styles.heroRule, { backgroundColor: colors.divider }]}
                />

                <View
                  style={[styles.heroCtas, isDesktop && styles.heroCtasDesktop]}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/login")}
                    style={({ pressed, hovered }) => [
                      styles.primaryButton,
                      {
                        backgroundColor: colors.accent,
                        borderColor: colors.accent,
                        opacity: pressed ? 0.9 : 1,
                        transform: [{ translateY: hovered ? -1 : 0 }],
                      },
                      Platform.OS === "web"
                        ? {
                            cursor: "pointer",
                            transitionProperty: "transform, opacity",
                            transitionDuration: "140ms",
                            transitionTimingFunction: "ease-out",
                          }
                        : null,
                    ]}
                  >
                    <TextBodyStrong
                      style={[
                        styles.primaryButtonText,
                        { color: colors.background },
                      ]}
                    >
                      Sign in with Google
                    </TextBodyStrong>
                  </Pressable>
                </View>
              </Reveal>

              <Reveal>
                <View
                  style={[styles.section, { borderTopColor: colors.divider }]}
                >
                  <TextMeta
                    style={[styles.sectionLabel, { color: colors.textMuted }]}
                  >
                    What this does
                  </TextMeta>
                  <TextHeading style={styles.sectionTitle}>
                    A premium publishing workflow, without the busywork
                  </TextHeading>
                  <TextBody
                    style={[styles.sectionBody, { color: colors.textPrimary }]}
                  >
                    This platform is built for creators who want to share ideas
                    consistently — without spending hours typing, brainstorming
                    titles, or polishing drafts from scratch.
                  </TextBody>

                  <View
                    style={[
                      styles.featureGrid,
                      isDesktop && styles.featureGridDesktop,
                    ]}
                  >
                    {featureItems.map((item) => (
                      <View
                        key={item.title}
                        style={[
                          styles.featureCard,
                          {
                            borderColor: colors.divider,
                            backgroundColor: colors.inputBackground,
                          },
                        ]}
                      >
                        <TextBodyStrong style={styles.featureTitle}>
                          {item.title}
                        </TextBodyStrong>
                        <TextBody
                          style={[
                            styles.featureBody,
                            { color: colors.textMuted },
                          ]}
                        >
                          {item.body}
                        </TextBody>
                      </View>
                    ))}
                  </View>
                </View>
              </Reveal>

              <Reveal>
                <View
                  style={[styles.section, { borderTopColor: colors.divider }]}
                >
                  <TextMeta
                    style={[styles.sectionLabel, { color: colors.textMuted }]}
                  >
                    How it works
                  </TextMeta>
                  <TextHeading style={styles.sectionTitle}>
                    From voice to publish-ready in 7 steps
                  </TextHeading>

                  <View style={[styles.steps, { borderColor: colors.divider }]}>
                    {[
                      "Open the app",
                      "Press record",
                      "Speak your thoughts out loud",
                      "AI transcribes and refines your content",
                      "A title is generated automatically",
                      "Your blog post is ready for viewers",
                      "Edit anything if you want more control",
                    ].map((step, index) => (
                      <View
                        key={step}
                        style={[
                          styles.stepRow,
                          index === 6
                            ? null
                            : { borderBottomColor: colors.divider },
                        ]}
                      >
                        <TextMeta
                          style={[
                            styles.stepIndex,
                            { color: colors.textMuted },
                          ]}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </TextMeta>
                        <TextBody
                          style={[
                            styles.stepText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {step}
                        </TextBody>
                      </View>
                    ))}
                  </View>
                </View>
              </Reveal>

              <Reveal>
                <View
                  style={[styles.section, { borderTopColor: colors.divider }]}
                >
                  <TextMeta
                    style={[styles.sectionLabel, { color: colors.textMuted }]}
                  >
                    Why this matters
                  </TextMeta>
                  <TextHeading style={styles.sectionTitle}>
                    Less friction. More ideas.
                  </TextHeading>
                  <TextBody
                    style={[styles.sectionBody, { color: colors.textPrimary }]}
                  >
                    Creators have spent years forcing every thought into a
                    perfect draft. This is a new era: capture your ideas at the
                    speed you think — and let AI handle the heavy lifting.
                  </TextBody>

                  <View
                    style={[
                      styles.ctaCard,
                      {
                        borderColor: colors.divider,
                        backgroundColor: colors.inputBackground,
                      },
                    ]}
                  >
                    <TextHeading style={styles.ctaTitle}>
                      Start publishing for free
                    </TextHeading>
                    <TextBody
                      style={[styles.ctaBody, { color: colors.textMuted }]}
                    >
                      Log in with Google to record a voice post, generate a
                      title, and publish a clean article.
                    </TextBody>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push("/login")}
                      style={({ pressed, hovered }) => [
                        styles.primaryButton,
                        {
                          backgroundColor: colors.accent,
                          borderColor: colors.accent,
                          opacity: pressed ? 0.9 : 1,
                          transform: [{ translateY: hovered ? -1 : 0 }],
                        },
                        Platform.OS === "web"
                          ? {
                              cursor: "pointer",
                              transitionProperty: "transform, opacity",
                              transitionDuration: "140ms",
                              transitionTimingFunction: "ease-out",
                            }
                          : null,
                      ]}
                    >
                      <TextBodyStrong
                        style={[
                          styles.primaryButtonText,
                          { color: colors.background },
                        ]}
                      >
                        Get started
                      </TextBodyStrong>
                    </Pressable>
                  </View>
                </View>
              </Reveal>
            </View>
          </View>
        </MotionScrollView>
      </ScrollMotionProvider>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
  },
  content: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
    alignItems: "stretch",
    paddingHorizontal: spacing.md,
  },
  kicker: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    textAlign: "center",
    width: "100%",
  },
  heroTitle: {
    textAlign: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 52,
    lineHeight: 56,
  },
  heroSubtitle: {
    textAlign: "center",
    marginBottom: spacing.md,
    fontSize: 17,
    lineHeight: 28,
  },
  heroRule: {
    height: 1,
    marginBottom: spacing.md,
  },
  heroCtas: {
    flexDirection: "column",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  heroCtasDesktop: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
  },
  heroFootnote: {
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  section: {
    borderTopWidth: 1,
    paddingTop: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionLabel: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  sectionTitle: {
    textAlign: "center",
    fontSize: 30,
    lineHeight: 36,
    marginBottom: spacing.sm,
  },
  sectionBody: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 26,
    marginBottom: spacing.lg,
  },
  featureGrid: {
    flexDirection: "column",
    gap: spacing.sm,
  },
  featureGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    borderWidth: 1,
    borderRadius: 2,
    padding: spacing.md,
    gap: spacing.xs,
    width: "100%",
  },
  featureTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  featureBody: {
    fontSize: 15,
    lineHeight: 24,
  },
  steps: {
    borderWidth: 1,
    borderRadius: 2,
    overflow: "hidden",
  },
  stepRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  stepIndex: {
    width: 34,
    textAlign: "right",
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  ctaCard: {
    borderWidth: 1,
    borderRadius: 2,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  ctaTitle: {
    textAlign: "center",
    fontSize: 28,
    lineHeight: 34,
  },
  ctaBody: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 24,
  },
});
