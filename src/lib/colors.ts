export const colors = {
  bg: "#080C14",
  card: "#0C1220",
  cardHover: "#101828",
  border: "#1A2438",
  borderSubtle: "#141E30",
  text: "#F0EDE6",
  textSecondary: "#8899B0",
  muted: "#5A7090",
  danger: "#FF4444",
  warning: "#FFB020",
  positive: "#00D68F",
  accent: "#4C9AFF",
} as const;

export type RunwayColor = keyof typeof colors;
