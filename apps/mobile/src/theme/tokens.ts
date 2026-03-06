export const colors = {
  primary: "#C8603A",
  primaryLight: "#E07A52",
  primaryDark: "#9E4A2A",
  primaryGlow: "rgba(200,96,58,0.14)",
  textStrong: "#5C3D2E",
  textMuted: "#9B8070",
  textSoft: "#7A5544",
  surface: "#FFFFFF",
  surfaceAlt: "#FDF6ED",
  surfaceSoft: "#F5EAD8",
  surfaceRaised: "#FFF9F2",
  surfaceWarm: "#FFF2E4",
  border: "#E8D5B7",
  borderStrong: "#D4B896",
  success: "#3D6B4F",
  danger: "#B83A2A",
  white: "#FFFFFF"
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999
} as const;

export const motion = {
  fast: 160,
  normal: 240,
  slow: 360
} as const;

export const elevation = {
  sm: {
    shadowColor: "#2A190F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3
  },
  md: {
    shadowColor: "#2A190F",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6
  }
} as const;

export const typography = {
  titleLg: 30,
  titleMd: 24,
  titleSm: 18,
  body: 14,
  bodySm: 12,
  caption: 11
} as const;

export const uiTheme = {
  colors,
  spacing,
  radius,
  motion,
  elevation,
  typography
} as const;
