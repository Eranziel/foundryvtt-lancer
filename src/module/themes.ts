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
  grayColor?: string;
  tooltipBackground: string;
  tooltipText: string;
  // TODO: gear types, actions, hits, etc
}

const themeCommon: Partial<LancerUITheme> = {
  grayColor: "#b3b9ba",
};

export const themeGMS: LancerUITheme = {
  ...themeCommon,
  primaryColor: "#991e2a",
  primaryHighlight: "color-mix(in srgb, var(--primary-color), #fff 55%)",
  primaryShadow: "#d52a3b",
  lightText: "#efefef",
  darkText: "#000000",
  backgroundColor: "#ededed",
  secondaryColor: "#283593",
  secondaryHighlight: "#color-mix(in srgb, var(--secondary-color), #fff 55%)",
  secondaryText: "#ffffff",
  tooltipBackground: "#ffffff", // todo
  tooltipText: "#000000", // todo
};

export const themeMSMC: LancerUITheme = {
  ...themeCommon,
  primaryColor: "#146464",
  primaryHighlight: "color-mix(in srgb, var(--primary-color), #fff 55%)",
  primaryShadow: "#2bd4d4",
  lightText: "#dbdbdb",
  darkText: "#dbdbdb",
  backgroundColor: "#263237",
  secondaryColor: "#cb8225",
  secondaryHighlight: "#color-mix(in srgb, var(--secondary-color), #fff 55%)",
  secondaryText: "#dbdbdb", // todo
  grayColor: "#3a4040",
  tooltipBackground: "#121d21", // todo
  tooltipText: "#b3b9ba", // todo
};

export const themeHORUS: LancerUITheme = {
  ...themeCommon,
  primaryColor: "#121212", // todo
  primaryHighlight: "color-mix(in srgb, var(--primary-color), #fff 55%)",
  primaryShadow: "",
  lightText: "#ffffff", // todo
  darkText: "#efefef", // todo
  backgroundColor: "#000000", // todo
  secondaryColor: "#ff0000", // todo
  secondaryHighlight: "#color-mix(in srgb, var(--secondary-color), #fff 55%)",
  secondaryText: "#ffffff", // todo
  grayColor: "#505758", // todo
  tooltipBackground: "#ffffff", // todo
  tooltipText: "#000000", // todo
};

export function applyTheme(theme: "gms" | "msmc" | "horus") {
  let selectedTheme: LancerUITheme;
  switch (theme) {
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
  document.documentElement.style.setProperty("--primary-color", selectedTheme.primaryColor);
  document.documentElement.style.setProperty("--primary-highlight", selectedTheme.primaryHighlight);
  document.documentElement.style.setProperty("--color-shadow-primary", selectedTheme.primaryShadow);
  document.documentElement.style.setProperty("--light-text", selectedTheme.lightText);
  document.documentElement.style.setProperty("--dark-text", selectedTheme.darkText);
  document.documentElement.style.setProperty("--bg-color", selectedTheme.backgroundColor);
  document.documentElement.style.setProperty("--secondary-color", selectedTheme.secondaryColor);
  document.documentElement.style.setProperty("--secondary-highlight", selectedTheme.secondaryHighlight);
  document.documentElement.style.setProperty("--secondary-text", selectedTheme.secondaryText);
  document.documentElement.style.setProperty("--tooltip-bg", selectedTheme.tooltipBackground);
  document.documentElement.style.setProperty("--tooltip-text", selectedTheme.tooltipText);
  if (selectedTheme.grayColor) {
    document.documentElement.style.setProperty("--gray-color", selectedTheme.grayColor);
  }
}
