import { PropsWithChildren } from "react";
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";

import {
    TextBody,
    TextBodyStrong,
    TextHeading,
    TextMeta,
} from "@/components/typography";
import { spacing } from "@/constants/editorial";
import { useAppTheme } from "@/lib/theme-context";

type ConfirmDialogProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
}>;

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  confirmDisabled = false,
  children,
}: ConfirmDialogProps) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const dialogWidth = Math.min(width - spacing.md * 2, 460);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdropWrap}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.divider,
              width: dialogWidth,
            },
          ]}
        >
          <TextHeading style={styles.title}>{title}</TextHeading>
          <TextBody style={styles.message}>{message}</TextBody>
          {children ? <View style={styles.extra}>{children}</View> : null}

          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed, hovered }) => [
                styles.button,
                {
                  backgroundColor:
                    pressed || hovered ? colors.inputBackground : "transparent",
                  borderColor: hovered ? colors.textMuted : colors.divider,
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
              <TextBodyStrong style={styles.buttonText}>
                {cancelLabel}
              </TextBodyStrong>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={confirmDisabled}
              onPress={onConfirm}
              style={({ pressed, hovered }) => [
                styles.button,
                {
                  backgroundColor: colors.accent,
                  borderColor: hovered ? colors.textPrimary : colors.accent,
                  opacity: confirmDisabled ? 0.6 : pressed ? 0.88 : 1,
                  transform: [{ translateY: hovered ? -1 : 0 }],
                },
                Platform.OS === "web"
                  ? ({
                      cursor: confirmDisabled ? "auto" : "pointer",
                      transitionProperty: "transform, opacity, border-color",
                      transitionDuration: "140ms",
                      transitionTimingFunction: "ease-out",
                    } as any)
                  : null,
              ]}
            >
              <TextBodyStrong
                style={[styles.buttonText, { color: colors.background }]}
              >
                {confirmLabel}
              </TextBodyStrong>
            </Pressable>
          </View>

          <TextMeta style={[styles.hint, { color: colors.textMuted }]}>
            Tip: tap outside this dialog to cancel.
          </TextMeta>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    borderWidth: 1,
    borderRadius: 2,
    padding: spacing.md,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
  },
  extra: {
    marginTop: spacing.sm,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 2,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 15,
  },
  hint: {
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
