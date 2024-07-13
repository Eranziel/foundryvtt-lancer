import type HUDZone from "./SlidingHUDZone.svelte";
import type { AccDiffHudData } from "../acc_diff";
import type { StructStressData } from "../struct_stress/data";

let hud: HUDZone;
// Look - I don't really know enough typescript to get it right,
// but these will hold the success/reject of any
let activeCallbacks: Record<keyof HUDData, null | [(value: any) => any, () => any]> = {
  attack: null,
  hase: null,
  struct: null,
  stress: null,
};

export async function attach() {
  if (!hud) {
    let HUDZone = (await import("./SlidingHUDZone.svelte")).default;
    hud = new HUDZone({
      target: document.body,
    });
    for (let key of ["attack", "hase", "struct", "stress"] as Array<keyof HUDData>) {
      hud.$on(`${key}.submit`, (ev: any) => {
        activeCallbacks[key]?.[0](ev.detail);
        activeCallbacks[key] = null;
      });
      hud.$on(`${key}.cancel`, () => {
        activeCallbacks[key]?.[1]();
        activeCallbacks[key] = null;
      });
    }
  }
  return hud;
}

export async function openSlidingHud<T extends keyof HUDData>(key: T, data: HUDData[T]): Promise<HUDData[T]> {
  let hud = await attach();

  // open the hud, cancelling existing listeners
  hud.open(key, data);

  return new Promise((resolve, reject) => {
    activeCallbacks[key] = [resolve, reject];
  });
}

export async function isHudOpen(key: keyof HUDData): Promise<boolean> {
  let hud = await attach();
  return hud.isOpen(key);
}

export async function fade(dir: "out" | "in" = "out") {
  let hud = await attach();
  hud.fade(dir);
}

type HUDData = { attack: AccDiffHudData; hase: AccDiffHudData; struct: StructStressData; stress: StructStressData };
