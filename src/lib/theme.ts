/**
 * Design system SoundBoss — hérité du thème web, sombre par défaut.
 * Police : Plus Jakarta Sans.
 */

export const couleurs = {
  charcoal: "#141110",
  charcoalLight: "#1C1816",
  warmGold: "#FBBF24",
  deepGold: "#B45309",
  terracotta: "#C65D3B",
  terracottaLight: "#E07A56",
  cream: "#F5F0EB",
  muted: "#A8A29E",
  danger: "#E0524A",
  success: "#34D399",
  // Dérivés utilitaires
  fond: "#141110",
  carte: "#1C1816",
  carteActive: "#211C19",
  // Surface de carte douce : translucide, se fond dans le fond (validée sur la home)
  surfaceCarte: "rgba(255,255,255,0.04)",
  bordureCarte: "rgba(255,255,255,0.05)",
  bordure: "rgba(255,255,255,0.08)",
  bordureForte: "rgba(255,255,255,0.16)",
  texte: "#F5F0EB",
  texteSecondaire: "#A8A29E",
  texteFaible: "rgba(245,240,235,0.62)",
  ombre: "#000000",
  warmGold10: "rgba(251,191,36,0.12)",
  warmGold15: "rgba(251,191,36,0.18)",
  terracotta15: "rgba(198,93,59,0.16)",
  terracottaLight10: "rgba(224,122,86,0.12)",
  success15: "rgba(52,211,153,0.16)",
  danger15: "rgba(224,82,74,0.16)",
} as const;

export const police = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
} as const;

export const espacement = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const rayons = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const tailles = {
  titre1: 28,
  titre2: 22,
  titre3: 18,
  corps: 15,
  petit: 13,
  micro: 11,
} as const;
