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
  lightGrayColor: "#b3b9ba",
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
};

export const themeHORUS: LancerUITheme = {
  ...themeGMS,
  primaryColor: "#121212", // todo
  primaryHighlight: "color-mix(in srgb, var(--primary-color), #fff 55%)",
  primaryShadow: "",
  lightText: "#ffffff", // todo
  darkText: "#efefef", // todo
  backgroundColor: "#000000", // todo
  secondaryColor: "#ff0000", // todo
  secondaryHighlight: "#color-mix(in srgb, var(--secondary-color), #fff 55%)",
  secondaryText: "#ffffff", // todo
  darkGrayColor: "#505758", // todo
  lightGrayColor: "#dbdbdb", // todo
  tooltipBackground: "#ffffff", // todo
  tooltipText: "#000000", // todo
  systemColor: "#4a962b",
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

export function applyTheme(theme: "gms" | "gmsDark" | "msmc" | "horus") {
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
