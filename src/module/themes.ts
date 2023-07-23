export interface LancerUITheme {
  primaryColor: string;
  primaryHighlight: string;
  lightText: string;
  darkText: string;
  backgroundColor: string;
  secondaryColor: string;
  secondaryHighlight: string;
  secondaryText: string;
  tooltipBackground: string;
  tooltipText: string;
}

export const themeGMS: LancerUITheme = {
  primaryColor: "#991e2a",
  primaryHighlight: "color-mix(in srgb, var(--primary-color), #fff 55%)",
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
  primaryColor: "#146464",
  primaryHighlight: "color-mix(in srgb, var(--primary-color), #fff 55%)",
  lightText: "#dbdbdb",
  darkText: "#dbdbdb",
  backgroundColor: "#263237",
  secondaryColor: "#d98f30",
  secondaryHighlight: "#color-mix(in srgb, var(--secondary-color), #fff 55%)",
  secondaryText: "##dbdbdb", // todo
  tooltipBackground: "#121d21", // todo
  tooltipText: "#b3b9ba", // todo
};

export const themeHORUS: LancerUITheme = {
  primaryColor: "#121212", // todo
  primaryHighlight: "color-mix(in srgb, var(--primary-color), #fff 55%)",
  lightText: "#ffffff", // todo
  darkText: "#efefef", // todo
  backgroundColor: "#000000", // todo
  secondaryColor: "#ff0000", // todo
  secondaryHighlight: "#color-mix(in srgb, var(--secondary-color), #fff 55%)",
  secondaryText: "#ffffff", // todo
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
  document.documentElement.style.setProperty("--light-text", selectedTheme.lightText);
  document.documentElement.style.setProperty("--dark-text", selectedTheme.darkText);
  document.documentElement.style.setProperty("--bg-color", selectedTheme.backgroundColor);
  document.documentElement.style.setProperty("--secondary-color", selectedTheme.secondaryColor);
  document.documentElement.style.setProperty("--secondary-highlight", selectedTheme.secondaryHighlight);
  document.documentElement.style.setProperty("--secondary-text", selectedTheme.secondaryText);
  document.documentElement.style.setProperty("--tooltip-bg", selectedTheme.tooltipBackground);
  document.documentElement.style.setProperty("--tooltip-text", selectedTheme.tooltipText);
}
