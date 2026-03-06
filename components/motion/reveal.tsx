import { PropsWithChildren, useMemo } from "react";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import { Platform, useWindowDimensions } from "react-native";
import Animated, {
    clamp,
    useAnimatedStyle,
    useSharedValue,
} from "react-native-reanimated";

import { useScrollY } from "@/components/motion/scroll-context";

type RevealProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  offsetY?: number;
  blurPx?: number;
  intensity?: number;
  parallaxPx?: number;
}>;

export function Reveal({
  children,
  style,
  offsetY = 18,
  blurPx = 10,
  intensity = 1,
  parallaxPx = 6,
}: RevealProps) {
  const scrollY = useScrollY();
  const { height: viewportHeight } = useWindowDimensions();

  const layoutY = useSharedValue<number | null>(null);
  const layoutH = useSharedValue<number>(0);

  const vh = useMemo(() => Math.max(1, viewportHeight), [viewportHeight]);

  const onLayout = (event: LayoutChangeEvent) => {
    layoutY.value = event.nativeEvent.layout.y;
    layoutH.value = event.nativeEvent.layout.height;
  };

  const animatedStyle = useAnimatedStyle(() => {
    if (layoutY.value === null) {
      return {
        opacity: 0,
        transform: [{ translateY: offsetY }],
      } as any;
    }

    const easeOutCubic = (t: number) => {
      "worklet";
      return 1 - Math.pow(1 - t, 3);
    };

    const y = layoutY.value;
    const h = layoutH.value;

    // Reveal starts before the element enters the viewport and completes
    // as it approaches the middle of the screen.
    const start = y - vh * 0.88;
    const end = y - vh * 0.58;
    const tRaw = (scrollY.value - start) / Math.max(1, end - start);
    const t = clamp(tRaw, 0, 1);

    // Apple-ish easing: fast initial pickup, smooth settle.
    const eased = easeOutCubic(t);

    // Keep subtle motion alive after reveal (parallax-like drift), so the
    // page never feels like it “stops” once everything is visible.
    const driftStart = y - vh * 0.2;
    const driftEnd = y + Math.max(220, vh * 0.6) + h * 0.2;
    const driftRaw =
      (scrollY.value - driftStart) / Math.max(1, driftEnd - driftStart);
    const drift = clamp(driftRaw, 0, 1);

    const maxOpacity = clamp(intensity, 0, 1);
    const opacity = 0.04 + Math.max(0, maxOpacity - 0.04) * eased;
    const translateY = offsetY * (1 - eased) - parallaxPx * drift;
    const scale = 0.988 + 0.012 * eased;

    const base: any = {
      opacity,
      transform: [{ translateY }, { scale }],
    };

    if (Platform.OS === "web") {
      const blur = blurPx * (1 - eased);
      base.filter = `blur(${blur.toFixed(2)}px)`;
      base.willChange = "transform, opacity, filter";
    }

    return base;
  }, [blurPx, intensity, offsetY, parallaxPx, vh]);

  return (
    <Animated.View onLayout={onLayout} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
