import { Reveal } from "@/components/motion/reveal";
import {
    MotionScrollView,
    ScrollMotionProvider,
} from "@/components/motion/scroll-context";
import { useFocusEffect } from "@react-navigation/native";
import { Audio } from "expo-av";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";

import { PostCard } from "@/components/post-card";
import { MeteringVisualizer } from "@/components/recording/metering-visualizer";
import { ScreenContainer } from "@/components/screen-container";
import { TextBody, TextHeading, TextMeta } from "@/components/typography";
import { FONT_FAMILIES, spacing } from "@/constants/editorial";
import { useAuth } from "@/lib/auth-context";
import { createVoicePostFromRecording, fetchFeedPosts } from "@/lib/posts";
import { useAppTheme } from "@/lib/theme-context";
import type { BlogPost } from "@/types/post";

const NATIVE_RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type VoiceState = "idle" | "recording" | "processing";

type RecordedAudio =
  | Blob
  | {
      uri: string;
      type: string;
      name: string;
    };

function formatDebugError(source: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const timestamp = new Date().toISOString();
  return `[${source}] ${message} | platform=${Platform.OS} | time=${timestamp}`;
}

export default function HomeScreen() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceStatusText, setVoiceStatusText] = useState<string>("");
  const [voiceErrorText, setVoiceErrorText] = useState<string>("");
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [webWaveformLevels, setWebWaveformLevels] = useState<number[]>(() =>
    Array.from({ length: 12 }, () => 0),
  );
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;

  const nativeRecordingRef = useRef<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const recordingTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const pulseRef = useRef(new Animated.Value(0));

  const webAudioContextRef = useRef<AudioContext | null>(null);
  const webAnalyserRef = useRef<AnalyserNode | null>(null);
  const webFreqDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const webRafRef = useRef<number | null>(null);
  const webLastUpdateRef = useRef<number>(0);
  const webWaveformRef = useRef<number[]>(Array.from({ length: 12 }, () => 0));

  const nativeMeteringDbRef = useRef(-160);
  const nativeHasMeteringRef = useRef(false);
  const nativeLastDurationUpdateRef = useRef(0);

  const loadPosts = useCallback(async () => {
    try {
      setIsLoadingPosts(true);
      if (!session?.user.id) {
        setPosts([]);
        return;
      }

      const feedPosts = await fetchFeedPosts(session.user.id);
      setPosts(feedPosts);
    } catch (error) {
      Alert.alert("Unable to load posts", (error as Error).message);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    const pulse = pulseRef.current;

    if (voiceState !== "recording") {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [voiceState]);

  useFocusEffect(
    useCallback(() => {
      void loadPosts();
      return;
    }, [loadPosts]),
  );

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

  const featuredPost = filteredPosts[0];
  const otherPosts = filteredPosts.slice(1);

  const waveformHeights = useMemo(() => {
    const base = 6;
    const max = 30;
    return webWaveformLevels.map((level) => {
      const clamped = Math.max(0, Math.min(1, level));
      return Math.round(base + clamped * (max - base));
    });
  }, [webWaveformLevels]);

  const processAudioDraft = async (audio: RecordedAudio) => {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in to create a voice post.");
      setVoiceState("idle");
      setVoiceStatusText("");
      setVoiceErrorText("");
      return;
    }

    try {
      setVoiceState("processing");
      setVoiceStatusText("Transcribing, saving transcript, and writing post…");

      const result = await createVoicePostFromRecording({
        audio,
        authorId: session.user.id,
        visibility: "public",
      });

      const refreshed = await fetchFeedPosts(session.user.id);
      setPosts(refreshed);

      setVoiceState("idle");
      setVoiceStatusText(
        `Published. Transcript saved: ${result.transcriptPath}`,
      );
      setVoiceErrorText("");
      setRecordingDurationMs(0);
      recordingStartedAtRef.current = null;

      router.push({ pathname: "/post/[id]", params: { id: result.postId } });
    } catch (error) {
      const debugMessage = formatDebugError("VOICE_PIPELINE", error);
      setVoiceState("idle");
      setVoiceStatusText("");
      setVoiceErrorText(debugMessage);
      setRecordingDurationMs(0);
      recordingStartedAtRef.current = null;
      Alert.alert("Voice post failed", debugMessage);
    }
  };

  const stopWebAudioVisualization = () => {
    if (webRafRef.current != null) {
      cancelAnimationFrame(webRafRef.current);
      webRafRef.current = null;
    }

    try {
      webAnalyserRef.current?.disconnect();
    } catch {
      // ignore
    }
    webAnalyserRef.current = null;
    webFreqDataRef.current = null;
    webLastUpdateRef.current = 0;

    const context = webAudioContextRef.current;
    webAudioContextRef.current = null;
    if (context) {
      context.close().catch(() => null);
    }
  };

  const startWebAudioVisualization = async (stream: MediaStream) => {
    stopWebAudioVisualization();

    const AudioContextCtor =
      (window as unknown as { AudioContext?: typeof AudioContext })
        .AudioContext ||
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const context = new AudioContextCtor();
    webAudioContextRef.current = context;

    if (context.state === "suspended") {
      await context.resume().catch(() => null);
    }

    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.85;
    source.connect(analyser);
    webAnalyserRef.current = analyser;

    const freqData = new Uint8Array(
      analyser.frequencyBinCount,
    ) as Uint8Array<ArrayBuffer>;
    webFreqDataRef.current = freqData;
    webWaveformRef.current = Array.from({ length: 12 }, () => 0);
    setWebWaveformLevels(webWaveformRef.current);

    const loop = (now: number) => {
      const currentAnalyser = webAnalyserRef.current;
      const data = webFreqDataRef.current;
      if (!currentAnalyser || !data) {
        return;
      }

      currentAnalyser.getByteFrequencyData(data);

      const lastUpdate = webLastUpdateRef.current;
      const shouldUpdateState = !lastUpdate || now - lastUpdate >= 33; // ~30fps

      if (shouldUpdateState) {
        webLastUpdateRef.current = now;

        const bars = webWaveformRef.current.slice();
        const barCount = bars.length;
        const startBin = 3;
        const endBin = Math.min(data.length - 1, 360);
        const binCount = Math.max(1, endBin - startBin);
        const binsPerBar = Math.max(1, Math.floor(binCount / barCount));

        for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
          const from = startBin + barIndex * binsPerBar;
          const to = Math.min(endBin, from + binsPerBar);
          let sum = 0;
          let count = 0;
          for (let bin = from; bin < to; bin += 1) {
            sum += data[bin] ?? 0;
            count += 1;
          }
          const avg = count ? sum / count : 0;
          // Normalize 0..255 -> 0..1, then apply a slight gamma for punch.
          const normalized = Math.pow(
            Math.max(0, Math.min(1, avg / 255)),
            0.65,
          );
          // Smooth with previous bar value.
          bars[barIndex] = bars[barIndex] * 0.62 + normalized * 0.38;
        }

        webWaveformRef.current = bars;
        setWebWaveformLevels(bars);

        if (recordingStartedAtRef.current) {
          setRecordingDurationMs(Date.now() - recordingStartedAtRef.current);
        }
      }

      webRafRef.current = requestAnimationFrame(loop);
    };

    webRafRef.current = requestAnimationFrame(loop);
  };

  const stopRecordingTicks = () => {
    if (recordingTickRef.current) {
      clearInterval(recordingTickRef.current);
      recordingTickRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!session) {
      Alert.alert("Sign in required", "Please sign in to record a post.");
      return;
    }

    try {
      setRecordingDurationMs(0);
      recordingStartedAtRef.current = Date.now();

      if (Platform.OS === "web") {
        if (
          !navigator?.mediaDevices?.getUserMedia ||
          typeof MediaRecorder === "undefined"
        ) {
          Alert.alert(
            "Unsupported",
            "Audio recording is not available in this browser.",
          );
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaStreamRef.current = stream;
        webChunksRef.current = [];

        await startWebAudioVisualization(stream);

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            webChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const blob = new Blob(webChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          stream.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
          stopWebAudioVisualization();
          await processAudioDraft(blob);
        };

        recorder.start();
      } else {
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Permission needed",
            "Microphone access is required to record.",
          );
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(NATIVE_RECORDING_OPTIONS);

        // Drive metering + duration from Expo's status updates (smooth + real audio-reactive).
        nativeMeteringDbRef.current = -160;
        nativeHasMeteringRef.current = false;
        nativeLastDurationUpdateRef.current = 0;
        recording.setProgressUpdateInterval(50);
        recording.setOnRecordingStatusUpdate((status: any) => {
          if (!status?.isRecording) {
            return;
          }

          const metering = status.metering;
          if (typeof metering === "number") {
            nativeHasMeteringRef.current = true;
            nativeMeteringDbRef.current = metering;
          }

          // Update the visible timer at a lower rate to avoid re-rendering the whole screen too often.
          const now = Date.now();
          if (
            !nativeLastDurationUpdateRef.current ||
            now - nativeLastDurationUpdateRef.current >= 200
          ) {
            nativeLastDurationUpdateRef.current = now;
            setRecordingDurationMs(status.durationMillis ?? 0);
          }
        });

        await recording.startAsync();
        nativeRecordingRef.current = recording;

        // No fake/random waveform fallbacks on native: visualizer reads real metering via refs.
        stopRecordingTicks();
      }

      setVoiceErrorText("");
      setVoiceState("recording");
      setVoiceStatusText(
        Platform.OS === "web"
          ? "Recording… speak now"
          : "Recording… tap again to stop.",
      );
    } catch (error) {
      stopRecordingTicks();
      stopWebAudioVisualization();
      const debugMessage = formatDebugError("VOICE_RECORD_START", error);
      setVoiceState("idle");
      setVoiceStatusText("");
      setVoiceErrorText(debugMessage);
      Alert.alert("Recording error", debugMessage);
    }
  };

  const stopRecording = async () => {
    try {
      if (Platform.OS === "web") {
        const recorder = mediaRecorderRef.current;
        stopWebAudioVisualization();
        if (!recorder) {
          throw new Error(
            "No active recorder found while stopping web recording.",
          );
        }
        recorder.stop();
        stopRecordingTicks();
        setVoiceState("processing");
        setVoiceStatusText("Processing recording…");
        return;
      }

      const recording = nativeRecordingRef.current;
      if (!recording) {
        throw new Error(
          "No active recorder found while stopping native recording.",
        );
      }

      setVoiceState("processing");
      setVoiceStatusText("Uploading audio…");

      await recording.stopAndUnloadAsync();
      recording.setOnRecordingStatusUpdate(null);
      const uri = recording.getURI();
      nativeRecordingRef.current = null;

      stopRecordingTicks();

      if (!uri) {
        throw new Error("No audio file produced.");
      }

      const uriExt = uri.split("?")[0]?.split("#")[0]?.split(".").pop();
      const ext = (uriExt || "m4a").toLowerCase();

      if (ext === "caf") {
        throw new Error(
          "Recorded audio is .caf on iOS, which Whisper does not support. The app must record to .m4a (AAC).",
        );
      }

      const mimeTypeByExt: Record<string, string> = {
        m4a: "audio/mp4",
        mp4: "audio/mp4",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        webm: "audio/webm",
        ogg: "audio/ogg",
      };

      const mimeType = mimeTypeByExt[ext] || "audio/mp4";
      const filename = `voice-post-${Date.now()}.${ext || "m4a"}`;

      await processAudioDraft({
        uri,
        type: mimeType,
        name: filename,
      });
    } catch (error) {
      stopRecordingTicks();
      stopWebAudioVisualization();
      const debugMessage = formatDebugError("VOICE_RECORD_STOP", error);
      setVoiceState("idle");
      setVoiceStatusText("");
      setVoiceErrorText(debugMessage);
      Alert.alert("Stop recording failed", debugMessage);
    }
  };

  useEffect(() => {
    return () => {
      stopRecordingTicks();
      stopWebAudioVisualization();
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // ignore
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    };
  }, []);

  return (
    <ScreenContainer>
      <TextHeading style={styles.feedTitle}>Today’s Edition</TextHeading>
      <TextMeta style={styles.subheading}>
        Fresh stories and editorial updates
      </TextMeta>

      <Pressable
        accessibilityRole="button"
        disabled={!session || voiceState === "processing"}
        onPress={voiceState === "recording" ? stopRecording : startRecording}
        style={({ pressed, hovered }) => [
          styles.recordButton,
          {
            borderColor: hovered ? colors.textMuted : colors.divider,
            backgroundColor:
              voiceState === "recording"
                ? colors.accent
                : pressed || hovered
                  ? colors.overlay
                  : "transparent",
            opacity: !session || voiceState === "processing" ? 0.6 : 1,
            transform: [{ translateY: hovered ? -1 : 0 }],
          },
          Platform.OS === "web"
            ? ({
                cursor:
                  !session || voiceState === "processing" ? "auto" : "pointer",
                transitionProperty:
                  "transform, background-color, opacity, border-color",
                transitionDuration: "140ms",
                transitionTimingFunction: "ease-out",
              } as any)
            : null,
        ]}
      >
        <TextBody
          style={{
            color:
              voiceState === "recording"
                ? colors.background
                : colors.textPrimary,
          }}
        >
          {voiceState === "recording" ? "Stop Recording" : "Record a post"}
        </TextBody>
      </Pressable>

      {voiceState !== "idle" ? (
        <View style={styles.voiceStatusRow}>
          {voiceState === "processing" ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : null}
          <TextMeta>{voiceStatusText}</TextMeta>
        </View>
      ) : null}

      {voiceState === "recording" ? (
        <View
          style={[
            styles.recordingCard,
            {
              borderColor: colors.divider,
              backgroundColor: colors.inputBackground,
            },
          ]}
        >
          <View style={styles.recordingHeaderRow}>
            <Animated.View
              style={[
                styles.recordingDot,
                {
                  backgroundColor: colors.accent,
                  opacity: pulseRef.current.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.35, 1],
                  }),
                  transform: [
                    {
                      scale: pulseRef.current.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
            <TextMeta style={{ color: colors.textPrimary }}>Recording</TextMeta>
            <View style={{ flex: 1 }} />
            <TextMeta style={{ color: colors.textMuted }}>
              {formatDuration(recordingDurationMs)}
            </TextMeta>
          </View>

          {Platform.OS === "web" ? (
            <View style={styles.waveRow}>
              {waveformHeights.map((height, index) => (
                <View
                  key={`wave-${index}`}
                  style={[
                    styles.waveBar,
                    {
                      height,
                      backgroundColor: colors.accent,
                      opacity: 0.78,
                    },
                  ]}
                />
              ))}
            </View>
          ) : (
            <MeteringVisualizer
              active={voiceState === "recording"}
              meteringDbRef={nativeMeteringDbRef}
              color={colors.accent}
              height={32}
              barCount={28}
              style={styles.waveRow}
            />
          )}

          <TextMeta style={{ color: colors.textMuted }}>
            Speak naturally — we’ll transcribe and write the post after you
            stop.
          </TextMeta>
        </View>
      ) : Platform.OS === "web" && voiceState === "processing" ? (
        <View
          style={[
            styles.recordingCard,
            {
              borderColor: colors.divider,
              backgroundColor: colors.inputBackground,
            },
          ]}
        >
          <View style={styles.recordingHeaderRow}>
            <View
              style={[
                styles.recordingDot,
                {
                  backgroundColor: colors.textMuted,
                  opacity: 0.55,
                },
              ]}
            />
            <TextMeta style={{ color: colors.textPrimary }}>
              Processing
            </TextMeta>
            <View style={{ flex: 1 }} />
            <TextMeta style={{ color: colors.textMuted }}>
              {formatDuration(recordingDurationMs)}
            </TextMeta>
          </View>

          <View style={styles.waveRow}>
            {waveformHeights.map((height, index) => (
              <View
                key={`wave-processing-${index}`}
                style={[
                  styles.waveBar,
                  {
                    height,
                    backgroundColor: colors.accent,
                    opacity: 0.4,
                  },
                ]}
              />
            ))}
          </View>

          <TextMeta style={{ color: colors.textMuted }}>
            Processing your recording…
          </TextMeta>
        </View>
      ) : null}

      {voiceErrorText ? (
        <TextMeta style={[styles.errorText, { color: colors.accent }]}>
          {voiceErrorText}
        </TextMeta>
      ) : null}

      {/* Recording feedback is visual (metering-driven) on iOS. */}

      <TextInput
        placeholder="Search your posts"
        placeholderTextColor={colors.textMuted}
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setIsSearchFocused(false)}
        selectionColor={colors.accent}
        style={[
          styles.searchInput,
          {
            color: colors.textPrimary,
            borderBottomColor: isSearchFocused ? colors.accent : colors.divider,
            backgroundColor: colors.inputBackground,
          },
        ]}
      />

      <ScrollMotionProvider>
        <MotionScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {isLoadingPosts ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.textPrimary} />
            </View>
          ) : null}

          {!isLoadingPosts && filteredPosts.length === 0 ? (
            <Reveal>
              <TextBody style={[styles.emptyText, { color: colors.textMuted }]}>
                You have not published any posts yet.
              </TextBody>
            </Reveal>
          ) : !isLoadingPosts ? (
            <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
              <View style={styles.mainColumn}>
                <Reveal offsetY={12} blurPx={8}>
                  <TextMeta style={styles.sectionLabel}>Your Posts</TextMeta>
                </Reveal>

                {featuredPost ? (
                  <Reveal offsetY={14} blurPx={10}>
                    <PostCard post={featuredPost} featured />
                  </Reveal>
                ) : null}

                {otherPosts.map((post) => (
                  <Reveal key={post.id} offsetY={18} blurPx={10}>
                    <PostCard post={post} />
                  </Reveal>
                ))}
              </View>
            </View>
          ) : null}
        </MotionScrollView>
      </ScrollMotionProvider>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  feedTitle: {
    fontSize: 30,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  subheading: {
    marginBottom: spacing.md,
  },
  recordButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  voiceStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  recordingCard: {
    borderWidth: 1,
    borderRadius: 2,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  recordingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  waveRow: {
    height: 32,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
  },
  waveBar: {
    width: 5,
    borderRadius: 999,
  },
  errorText: {
    marginBottom: spacing.sm,
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
    fontSize: 15,
  },
  grid: {
    flexDirection: "column",
    gap: spacing.lg,
  },
  gridDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  mainColumn: {
    flex: 2,
  },
  railColumn: {
    flex: 1,
    gap: spacing.md,
    paddingLeft: spacing.md,
  },
  sectionLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  railBlock: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  railTitle: {
    fontSize: 22,
    marginBottom: spacing.sm,
  },
  railItem: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  railDivider: {
    height: 1,
    marginBottom: spacing.sm,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
  },
});
