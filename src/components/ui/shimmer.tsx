import { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { couleurs, rayons } from "@/lib/theme";

/**
 * Squelette de chargement avec effet shimmer (reflet lumineux animé).
 * Utilisé pour les listes en cours de chargement.
 */
export function Shimmer({ style }: { style?: StyleProp<ViewStyle> }) {
  const progression = useSharedValue(0);

  useEffect(() => {
    progression.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(progression);
  }, [progression]);

  const styleReflet = useAnimatedStyle(() => ({
    transform: [{ translateX: -160 + progression.value * 420 }],
  }));

  return (
    <View
      style={[
        {
          borderRadius: rayons.md,
          backgroundColor: couleurs.surfaceCarte,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, styleReflet]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.08)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: 140, height: "100%" }}
        />
      </Animated.View>
    </View>
  );
}

/**
 * Squelette de liste : N lignes shimmer espacées.
 */
export function SqueletteListe({
  lignes = 3,
  hauteur = 80,
  style,
}: {
  lignes?: number;
  hauteur?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: lignes }).map((_, i) => (
        <Shimmer key={i} style={[{ height: hauteur }, style]} />
      ))}
    </View>
  );
}
