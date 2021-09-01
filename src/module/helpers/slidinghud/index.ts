import type HUDZone from './SlidingHUDZone.svelte';
import type { AccDiffData } from '../acc_diff';

let hud: HUDZone;

export async function attach() {
  if (!hud) {
    let HUDZone = (await import('./SlidingHUDZone.svelte')).default;
    hud = new HUDZone({
      target: document.body
    });
  }
  return hud;
}

export async function open(key: "hase" | "attack", data: AccDiffData): Promise<AccDiffData> {
  let hud = await attach();

  // open the hud, cancelling existing listeners
  hud.open(key, data);

  return new Promise((resolve, reject) => {
    hud.$on(`${key}.submit`, (ev: CustomEvent<AccDiffData>) => resolve(ev.detail));
    hud.$on(`${key}.cancel`, () => reject());
  });
}

export async function isOpen(key: "hase" | "attack"): Promise<boolean> {
  let hud = await attach();
  return hud.isOpen(key);
}

export async function fade(dir: "out" | "in" = "out") {
  let hud = await attach();
  hud.fade(dir);
}
