export type AppThemeMode = "dark" | "light";

export const FONT_FAMILIES = {
  display: "Questrial_400Regular",
  heading: "Mate_400Regular",
  body: "SourceSansPro_400Regular",
  bodySemiBold: "SourceSansPro_600SemiBold",
  bodyBold: "SourceSansPro_700Bold",
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

const darkPalette = {
  background: "#111315",
  surface: "#181B1F",
  textPrimary: "#F1F3F5",
  textMuted: "#9EA5AE",
  divider: "#2A2F36",
  accent: "#B38A58",
  inputBackground: "#14181C",
  overlay: "rgba(17,19,21,0.65)",
};

const lightPalette = {
  background: "#F7F5F2",
  surface: "#F0ECE6",
  textPrimary: "#15181B",
  textMuted: "#5B6168",
  divider: "#D7D0C6",
  accent: "#8B5E34",
  inputBackground: "#FDFBF8",
  overlay: "rgba(247,245,242,0.7)",
};

export const palettes = {
  dark: darkPalette,
  light: lightPalette,
} as const;
