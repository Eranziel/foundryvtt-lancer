export default async function preloadHUDs() {
  // Import the various HUD apps. No need to await or do anything with them, since this
  // is just preloading.
  const _HUDZone = import("./SlidingHUDZone.svelte");
  const _AccDiffHUD = import("../acc_diff/AccDiffHUD.svelte");
  const _DamageHUD = import("../damage/DamageHUD.svelte");
  const _StructStressHUD = import("../struct_stress/StructStressHUD.svelte");
}
