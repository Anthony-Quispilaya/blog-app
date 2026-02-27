import type { MutableRefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    StyleSheet,
    View,
    type LayoutChangeEvent,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import Svg, { Rect } from "react-native-svg";

type Props = {
  active: boolean;
  meteringDbRef: MutableRefObject<number>;
  color: string;
  height?: number;
  barCount?: number;
  style?: StyleProp<ViewStyle>;
};

function normalizeDbToUnit(db: number) {
  // expo-av iOS metering is typically in dBFS (-160..0).
  // Map a useful range into 0..1.
  const floor = -60;
  const ceiling = 0;
  const clamped = Math.max(floor, Math.min(ceiling, db));
  const unit = (clamped - floor) / (ceiling - floor);
  // Slight gamma for a premium “voice memo” feel.
  return Math.pow(unit, 0.7);
}

export function MeteringVisualizer({
  active,
  meteringDbRef,
  color,
  height = 32,
  barCount = 24,
  style,
}: Props) {
  const [width, setWidth] = useState(0);
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: barCount }, () => 0),
  );

  const barsRef = useRef<number[]>(Array.from({ length: barCount }, () => 0));
  const historyRef = useRef<number[]>(
    Array.from({ length: barCount * 2 }, () => 0),
  );
  const rafRef = useRef<number | null>(null);
  const lastStateCommitRef = useRef(0);

  // Keep refs aligned if barCount changes.
  useEffect(() => {
    const nextBars = Array.from({ length: barCount }, () => 0);
    barsRef.current = nextBars;
    setBars(nextBars);
    historyRef.current = Array.from({ length: barCount * 2 }, () => 0);
  }, [barCount]);

  useEffect(() => {
    if (!active) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const loop = (now: number) => {
      if (!active) {
        return;
      }

      const unit = normalizeDbToUnit(meteringDbRef.current);

      // Push into history.
      const history = historyRef.current;
      history.push(unit);
      while (history.length > barCount * 2) {
        history.shift();
      }

      // Derive bar heights from recent history (right = newest).
      const stride = Math.max(1, Math.floor(history.length / barCount));
      const next = barsRef.current.slice();
      for (let i = 0; i < barCount; i += 1) {
        const sampleIndex = Math.max(0, history.length - 1 - i * stride);
        const sample = history[sampleIndex] ?? 0;
        // Smooth for fluid motion.
        next[barCount - 1 - i] = next[barCount - 1 - i] * 0.55 + sample * 0.45;
      }

      barsRef.current = next;

      // Commit to React state at ~30fps (keeps UI smooth without spamming renders).
      if (
        !lastStateCommitRef.current ||
        now - lastStateCommitRef.current >= 33
      ) {
        lastStateCommitRef.current = now;
        setBars(next);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active, barCount, meteringDbRef]);

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.max(0, Math.round(event.nativeEvent.layout.width));
    if (nextWidth && nextWidth !== width) {
      setWidth(nextWidth);
    }
  };

  const geometry = useMemo(() => {
    if (!width) {
      return { barWidth: 0, gap: 0, radius: 0 };
    }

    const gap = 5;
    const totalGap = gap * (barCount - 1);
    const barWidth = Math.max(2, Math.floor((width - totalGap) / barCount));
    const radius = Math.min(999, Math.floor(barWidth / 2));
    return { barWidth, gap, radius };
  }, [barCount, width]);

  return (
    <View style={[styles.root, { height }, style]} onLayout={onLayout}>
      {width ? (
        <Svg width={width} height={height}>
          {bars.map((unit, index) => {
            const minBar = 3;
            const maxBar = height;
            const h = Math.round(minBar + unit * (maxBar - minBar));
            const x = index * (geometry.barWidth + geometry.gap);
            const y = height - h;

            return (
              <Rect
                key={`meter-bar-${index}`}
                x={x}
                y={y}
                width={geometry.barWidth}
                height={h}
                rx={geometry.radius}
                ry={geometry.radius}
                fill={color}
                opacity={0.86}
              />
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    overflow: "hidden",
  },
});
