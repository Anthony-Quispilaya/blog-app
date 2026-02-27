import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import type { ScrollViewProps } from "react-native";
import Animated, {
    runOnJS,
    useAnimatedScrollHandler,
    useSharedValue,
    type SharedValue,
} from "react-native-reanimated";

type ScrollMotionContextValue = {
  scrollY: SharedValue<number>;
};

const ScrollMotionContext = createContext<ScrollMotionContextValue | null>(
  null,
);

export function ScrollMotionProvider({ children }: PropsWithChildren) {
  const scrollY = useSharedValue(0);

  const value = useMemo(() => ({ scrollY }), [scrollY]);
  return (
    <ScrollMotionContext.Provider value={value}>
      {children}
    </ScrollMotionContext.Provider>
  );
}

export function useScrollY() {
  const ctx = useContext(ScrollMotionContext);
  if (!ctx) {
    throw new Error("useScrollY must be used within ScrollMotionProvider");
  }
  return ctx.scrollY;
}

type MotionScrollViewProps = ScrollViewProps & {
  scrollEventThrottle?: number;
};

export function MotionScrollView({
  children,
  scrollEventThrottle = 16,
  onScroll,
  ...props
}: MotionScrollViewProps) {
  const scrollY = useScrollY();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;

      if (onScroll) {
        runOnJS(onScroll)(event as any);
      }
    },
  });

  return (
    <Animated.ScrollView
      {...props}
      scrollEventThrottle={scrollEventThrottle}
      onScroll={scrollHandler}
    >
      {children}
    </Animated.ScrollView>
  );
}
