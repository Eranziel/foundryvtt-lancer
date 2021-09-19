import type HUDZone from "./SlidingHUDZone.svelte";
import type { AccDiffData } from "../acc_diff";
import type { StructStressData } from "../struct_stress/data";

let hud: HUDZone;

export async function attach() {
  if (!hud) {
    let HUDZone = (await import("./SlidingHUDZone.svelte")).default;
    hud = new HUDZone({
      target: document.body,
    });
  }
  return hud;
}

export async function open<T extends keyof HUDData>(key: T, data: HUDData[T]): Promise<HUDData[T]> {
  let hud = await attach();

  // open the hud, cancelling existing listeners
  hud.open(key, data);

  return new Promise((resolve, reject) => {
    hud.$on(`${key}.submit`, (ev: CustomEvent<HUDData[T]>) => resolve(ev.detail));
    hud.$on(`${key}.cancel`, () => reject());
  });
}

export async function isOpen(key: keyof HUDData): Promise<boolean> {
  let hud = await attach();
  return hud.isOpen(key);
}

export async function fade(dir: "out" | "in" = "out") {
  let hud = await attach();
  hud.fade(dir);
}

type HUDData = { attack: AccDiffData; hase: AccDiffData; struct: StructStressData; stress: StructStressData };
