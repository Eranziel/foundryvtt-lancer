import type HUDZone from './SlidingHUDZone.svelte';
import type { AccDiffData } from '../acc_diff';

let hud: typeof HUDZone;

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
  // @ts-ignore
  hud.open(key, data);

  return new Promise((resolve, reject) => {
    hud.$on(`${key}.submit`, (ev: CustomEvent<AccDiffData>) => resolve(ev.detail));
    hud.$on(`${key}.cancel`, () => reject());
  });
}

// this method differs from open() in two key ways
// 1. it's not allowed to open new windows
// 2. it never allows the caller to observe the data via promise,
//      assuming if the window was open that the existing handler is what we want to preserve
export async function refreshTargets(key: "hase" | "attack", ts: Token[] | AccDiffData) {
  let hud = await attach();

  // this method isn't allowed to open new windows, so bail out if it isn't open
  // @ts-ignore
  if (!hud.isOpen(key)) { return; }

  let { AccDiffData } = await import('../acc_diff');

  if (ts instanceof AccDiffData) {
    // @ts-ignore
    return hud.refresh(key, ts);
  }

  // @ts-ignore
  let oldData: AccDiffData = hud.data(key);
  if (!oldData || !(oldData instanceof AccDiffData)) {
    throw new Error(`${key} hud is open without valid data: ${oldData}`);
  }
  let data: AccDiffData = oldData.replaceTargets(ts);

  // @ts-ignore
  hud.refresh(key, data);
}

// this method opens a new window if one isn't open, with as much data as we have, allowing new listeners
// otherwise, it refreshes the existing window, disallowing new listeners
export async function openOrRefresh(key: "hase" | "attack", ts: Token[] | AccDiffData, title: string): Promise<AccDiffData> {
  let hud = await attach();
  // @ts-ignore
  if (hud.isOpen(key)) {
    refreshTargets(key, ts);
    return new Promise((_res, rej) => rej());
  } else {
    let { AccDiffData } = await import('../acc_diff');
    return open(key, ts instanceof AccDiffData ? ts :
      AccDiffData.fromParams(undefined, undefined, title, ts, undefined))
  }
}

export async function fade(dir: "out" | "in" = "out") {
  let hud = await attach();
  // @ts-ignore
  hud.fade(dir);
}
