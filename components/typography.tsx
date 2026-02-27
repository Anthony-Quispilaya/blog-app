import { PropsWithChildren } from "react";
import {
    StyleProp,
    StyleSheet,
    Text,
    TextProps,
    TextStyle,
} from "react-native";

import { FONT_FAMILIES } from "@/constants/editorial";
import { useAppTheme } from "@/lib/theme-context";

type TypographyProps = PropsWithChildren<{
  style?: StyleProp<TextStyle>;
}> &
  TextProps;

export function TextDisplay({ children, style, ...props }: TypographyProps) {
  const { colors } = useAppTheme();
  return (
    <Text
      {...props}
      style={[styles.display, { color: colors.textPrimary }, style]}
    >
      {children}
    </Text>
  );
}

export function TextHeading({ children, style, ...props }: TypographyProps) {
  const { colors } = useAppTheme();
  return (
    <Text
      {...props}
      style={[styles.heading, { color: colors.textPrimary }, style]}
    >
      {children}
    </Text>
  );
}

export function TextBody({ children, style, ...props }: TypographyProps) {
  const { colors } = useAppTheme();
  return (
    <Text
      {...props}
      style={[styles.body, { color: colors.textPrimary }, style]}
    >
      {children}
    </Text>
  );
}

export function TextBodyStrong({ children, style, ...props }: TypographyProps) {
  const { colors } = useAppTheme();
  return (
    <Text
      {...props}
      style={[styles.bodyStrong, { color: colors.textPrimary }, style]}
    >
      {children}
    </Text>
  );
}

export function TextMeta({ children, style, ...props }: TypographyProps) {
  const { colors } = useAppTheme();
  return (
    <Text {...props} style={[styles.meta, { color: colors.textMuted }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: FONT_FAMILIES.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.2,
  },
  heading: {
    fontFamily: FONT_FAMILIES.heading,
    fontSize: 24,
    lineHeight: 30,
  },
  body: {
    fontFamily: FONT_FAMILIES.body,
    fontSize: 17,
    lineHeight: 28,
  },
  bodyStrong: {
    fontFamily: FONT_FAMILIES.bodySemiBold,
    fontSize: 17,
    lineHeight: 28,
  },
  meta: {
    fontFamily: FONT_FAMILIES.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
