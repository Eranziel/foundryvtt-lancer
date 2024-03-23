export interface LancerUITheme {
  primaryColor: string;
  primaryHighlight: string;
  primaryShadow: string;
  lightText: string;
  darkText: string;
  backgroundColor: string;
  secondaryColor: string;
  secondaryHighlight: string;
  secondaryText: string;
  darkGrayColor: string;
  lightGrayColor: string;
  tooltipBackground: string;
  tooltipText: string;
  // Gear type colors
  systemColor: string;
  weaponColor: string;
  traitColor: string;
  bonusColor: string;
  bonusListColor: string;
  techColor: string;
  talentColor: string;
  pilotStatColor: string;
  // Action type colors
  reactionColor: string;
  protocolColor: string;
  quickColor: string;
  quickTechColor: string;
  invadeColor: string;
  fullColor: string;
  fullTechColor: string;
  freeColor: string;
  moveColor: string;
  // Hit type colors
  critColor: string;
  hitColor: string;
  missColor: string;
  errorColor: string;
  // Darken - for card backgrounds, etc...
  darkenColor: string;
}

// This theme includes all colors, and is then used to populate the others with defaults.
// That way, switching to a theme with an optional color and back will restore the default.
export const themeGMS: LancerUITheme = {
  primaryColor: "#991e2a",
  primaryHighlight: "color-mix(in srgb, var(--primary-color), #fff 55%)",
  primaryShadow: "#d52a3b",
  lightText: "#efefef",
  darkText: "#000000",
  backgroundColor: "#ededed",
  secondaryColor: "#9e541f",
  secondaryHighlight: "#color-mix(in srgb, var(--secondary-color), #fff 55%)",
  secondaryText: "#ffffff",
  darkGrayColor: "#4d4d4d",
  lightGrayColor: "#919a9b",
  tooltipBackground: "#dbdbdb",
  tooltipText: "#000000",
  // Gear type colors
  systemColor: "#58b434",
  weaponColor: "#111111",
  traitColor: "#0a7674",
  bonusColor: "#5d8673",
  bonusListColor: "#71a373",
  techColor: "#7d2477",
  talentColor: "#3a81c3",
  pilotStatColor: "color-mix(in srgb, var(--background-color), #888 50%)",
  // Action type colors
  reactionColor: "#892eb1",
  protocolColor: "#c75a00",
  quickColor: "#3949ab",
  quickTechColor: "#3949ab",
  invadeColor: "#222222",
  fullColor: "#283593",
  fullTechColor: "#283593",
  freeColor: "#00695c",
  moveColor: "#cc0a0a",
  // Hit type colors
  critColor: "#b36c3e",
  hitColor: "#1a4015",
  missColor: "#3c3c3c",
  errorColor: "#b4800e",
  // Darken - for card backgrounds, etc...
  darkenColor: "0, 0, 0",
};

export const themeGMSDark: LancerUITheme = {
  ...themeGMS,
  primaryHighlight: "color-mix(in srgb, var(--primary-color), #fff 35%)",
  lightText: "#d2d2d2",
  darkText: "#efefef",
  backgroundColor: "#333333",
  lightGrayColor: "#666666",
  tooltipBackground: "#050505",
  tooltipText: "#efefef",
  systemColor: "#4a962b",
  darkenColor: "0, 0, 0",
};

export const themeMSMC: LancerUITheme = {
  ...themeGMS,
  primaryColor: "#146464",
  primaryHighlight: "color-mix(in srgb, var(--primary-color), #fff 55%)",
  primaryShadow: "#2bd4d4",
  lightText: "#dbdbdb",
  darkText: "#dbdbdb",
  backgroundColor: "#263237",
  secondaryColor: "#cb8225",
  secondaryHighlight: "#color-mix(in srgb, var(--secondary-color), #fff 55%)",
  secondaryText: "#dbdbdb",
  darkGrayColor: "#2e2e2e",
  lightGrayColor: "#666666",
  tooltipBackground: "#121d21",
  tooltipText: "#b3b9ba",
  systemColor: "#4a962b",
  traitColor: "#009e89",
  darkenColor: "0, 0, 0",
};

export const themeHORUS: LancerUITheme = {
  ...themeGMS,
  primaryColor: "#126127",
  primaryHighlight: "color-mix(in srgb, var(--primary-color), #fff 55%)",
  primaryShadow: "#97e308",
  lightText: "#ffffff",
  darkText: "#efefef",
  backgroundColor: "#000000",
  secondaryColor: "#084661",
  secondaryHighlight: "#color-mix(in srgb, var(--secondary-color), #fff 55%)",
  secondaryText: "#ffffff",
  darkGrayColor: "#3c443e",
  lightGrayColor: "#657268",
  tooltipBackground: "#141414",
  tooltipText: "#d3d3d3",
  systemColor: "#4a962b",
  talentColor: "#2f689d",
  darkenColor: "125, 125, 125",
};

export const themeHA: LancerUITheme = {
  ...themeGMS,
  primaryColor: "#771675",
  primaryHighlight: "color-mix(in srgb, var(--primary-color), #fff 55%)",
  primaryShadow: "#d628d2",
  lightText: "#ffffff",
  darkText: "#b3b9ba",
  backgroundColor: "#2b2b2b",
  secondaryColor: "#cf4bdb",
  secondaryHighlight: "#color-mix(in srgb, var(--secondary-color), #fff 55%)",
  secondaryText: "#ffffff",
  darkGrayColor: "#4d4d4d",
  lightGrayColor: "#555555",
  tooltipBackground: "#222222",
  tooltipText: "#ffffff",
  // Gear type colors
  systemColor: "#b035ad",
  talentColor: "#e080de",
  pilotStatColor: "#333333",
  darkenColor: "64, 64, 64",
};

export const themeSSC: LancerUITheme = {
  ...themeGMS,
  primaryColor: "#d1920a",
  primaryHighlight: "color-mix(in srgb, var(--primary-color), #fff 55%)",
  primaryShadow: "#fbe2ac",
  lightText: "#ffffff",
  darkText: "#000000",
  backgroundColor: "#eee8d5",
  secondaryColor: "#685d99",
  secondaryHighlight: "#color-mix(in srgb, var(--secondary-color), #fff 55%)",
  secondaryText: "#ffffff",
  darkGrayColor: "#5a4c3f",
  lightGrayColor: "#eadbcb",
  tooltipBackground: "#d6c9b0",
  tooltipText: "#000000",
  // Gear type colors
  systemColor: "#89610B",
  talentColor: "#b58900",
  pilotStatColor: "#eadbcb",
  darkenColor: "64, 64, 64",
};

function varName(key: string) {
  return (
    "--" +
    key
      .trim()
      .replace(/(\B)([A-Z])/gm, "-$&")
      .toLowerCase()
  );
}

export function applyTheme(theme: "gms" | "gmsDark" | "msmc" | "horus" | "ha" | "ssc") {
  let selectedTheme: LancerUITheme;
  switch (theme) {
    case "gmsDark":
      selectedTheme = themeGMSDark;
      break;
    case "msmc":
      selectedTheme = themeMSMC;
      break;
    case "horus":
      selectedTheme = themeHORUS;
      break;
    case "ha":
      selectedTheme = themeHA;
      break;
    case "ssc":
      selectedTheme = themeSSC;
      break;
    case "gms":
    default:
      selectedTheme = themeGMS;
      break;
  }
  for (const key in selectedTheme) {
    // Handle special cases first
    if (key === "primaryShadow") {
      document.documentElement.style.setProperty("--color-shadow-primary", selectedTheme[key]);
    } else {
      // @ts-expect-error
      document.documentElement.style.setProperty(varName(key), selectedTheme[key]);
    }
  }
}
