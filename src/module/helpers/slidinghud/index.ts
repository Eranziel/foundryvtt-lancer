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

export async function open(
  key: "hase" | "attack",
  newData: AccDiffData | Token[],
  mode: "may open new window" | "only refresh open window"
): Promise<AccDiffData> {
  let { AccDiffData } = await import('../acc_diff');
  if (!hud) { attach(); }

  // @ts-ignore
  let wasOpen: boolean = hud.isOpen(key);

  // if we're only allowed to refresh open windows, and the window isn't open, just refresh it
  // don't allow new handlers in this case — they wouldn't make sense anyway, the window isn't open
  // why even bother with the refresh?
  // just in case there's some data here that would make sense to keep a hold of for a later
  // target-only open of the window, like a character becoming impaired from underneath us
  if (!wasOpen && mode == "only refresh open window") {
    // @ts-ignore
    hud.refresh(key, newData);
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
