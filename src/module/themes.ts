const themeClassMap = {
  gms: "theme-gms-red",
  gmsDark: "theme-gms-dark",
  msmc: "theme-msmc",
  horus: "theme-horus",
  ha: "theme-ha",
  ssc: "theme-ssc",
  ipsn: "theme-ipsn",
  gal: "theme-galsim",
};

export function applyTheme(theme: "gms" | "gmsDark" | "msmc" | "horus" | "ha" | "ssc" | "ipsn" | "gal") {
  const body = document.querySelector("body");
  if (!body) return;
  // Remove current theme class, if any
  body.classList.remove(...Object.values(themeClassMap));
  body.classList.add(themeClassMap[theme]);
}
