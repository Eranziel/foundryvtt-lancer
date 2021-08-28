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
}

function rejectedPromise<T>(): Promise<T> {
  return new Promise((_res, rej) => { rej() });
}

export async function open(key: "hase" | "attack", newData: AccDiffData | Token[]): Promise<AccDiffData> {
  let { AccDiffData } = await import('../acc_diff');
  if (!hud) { attach(); }

  // @ts-ignore
  let wasOpen: boolean = hud.isOpen(key);

  // if we're an attack roll, and we have no targets, and we weren't open, then... don't do anything
  if (key == "attack" && !wasOpen && newData instanceof Array && newData.length == 0) {
    return rejectedPromise();
  }

  // @ts-ignore
  let oldData: AccDiffData = hud.data(key);

  let data: AccDiffData = newData instanceof AccDiffData ? newData :
    (oldData ? oldData.replaceTargets(newData) :
      AccDiffData.fromParams(undefined, undefined, 'Basic Attack', newData, undefined));

  // when given completely new data, we always want to cancel existing listeners
  // when given just targets, we want to preserve existing listeners
  let cancelExisting = newData instanceof AccDiffData ? "cancel existing listeners" : null;
  // @ts-ignore
  hud.open(key, data, cancelExisting);

  // if there were older listeners (the form was open), and we didn't cancel them
  // we want to not allow this particular call to set up new listeners
  if (wasOpen && !cancelExisting) {
    return rejectedPromise();
  } else {
    return new Promise((resolve, reject) => {
      hud.$on(`${key}.submit`, (ev: CustomEvent<AccDiffData>) => resolve(ev.detail));
      hud.$on(`${key}.cancel`, () => reject());
    });
  }
}
