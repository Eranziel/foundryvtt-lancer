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
  // TODO: gear types, actions, hits, etc
}

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
};

export const themeMSMC: LancerUITheme = {
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
};

export const themeHORUS: LancerUITheme = {
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
  document.documentElement.style.setProperty("--dark-gray-color", selectedTheme.darkGrayColor);
  document.documentElement.style.setProperty("--light-gray-color", selectedTheme.lightGrayColor);
}
