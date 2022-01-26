import { EntryType, RegEntry, RegRef } from "machine-mind";
import type { LancerActor, LancerActorType } from "../actor/lancer-actor";
import type { LancerItem, LancerItemType } from "../item/lancer-item";

export const DEBOUNCE_TIMEOUT = 500; // An update propagation hook will fire at most once every this many MS.
// Triggers on falling edge (meaning will wait for updates to stop pouring in before firing
type RegDocument<T extends EntryType> = foundry.abstract.Document<any, any> | RegEntry<T> | RegRef<T>;

export class LancerHooks {
  static call(doc: foundry.abstract.Document<any, any>) {
    var id = doc.id!;
    // return Hooks.call(id, doc)
    debounce_trigger(id, doc);
  }

  static on<E extends foundry.abstract.Document<any, any>>(doc: E, callback: (arg: E) => any): LancerSubscription;
  static on<T extends LancerActorType>(doc: RegDocument<T>, callback: (arg: LancerActor) => any): LancerSubscription;
  static on<T extends LancerItemType>(doc: RegDocument<T>, callback: (arg: LancerItem) => any): LancerSubscription;

  static on<T extends EntryType>(doc: RegDocument<T>, callback: (arg: any) => any): LancerSubscription {
    var id: string;
    if (doc instanceof RegEntry) {
      id = doc.RegistryID;
    } else {
      id = doc.id!;
    }
    let subId = Hooks.on(id, callback);
    return new LancerSubscription(id, subId);
  }

  static off(sub: LancerSubscription): void;
  static off(doc: RegDocument<any>, callback: number): void;
  static off(doc: RegDocument<any>, callback: (arg: foundry.abstract.Document<any, any>) => any): void;
  static off<T extends LancerActorType>(doc: RegDocument<T>, callback: (arg: LancerActor) => any): void;
  static off<T extends LancerItemType>(doc: RegDocument<T>, callback: (arg: LancerItem) => any): void;

  static off(entityOrSub: LancerSubscription | RegDocument<any>, callback?: number | ((arg: any) => any)): void {
    var id: string;
    if (entityOrSub instanceof LancerSubscription) {
      return entityOrSub.unsubscribe();
    } else if (entityOrSub instanceof RegEntry) {
      id = entityOrSub.RegistryID;
    } else {
      id = entityOrSub.id!;
    }
    if (callback) {
      return Hooks.off(id, callback);
    }
  }
}

/**
 * A helper class for easily handling LancerHook subscriptions.
 * Store this when it is returned from LancerHook.on() and use unsubscribe() to remove the hook.
 */
export class LancerSubscription {
  private name: string;
  private id: number;

  constructor(name: string, id: number) {
    this.name = name;
    this.id = id;
  }

  unsubscribe() {
    Hooks.off(this.name, this.id);
  }
}

// Given the number of things that can trigger a hook, we debounce to make sure we're only really sending out one signal per set of updates (including user mashing + on a sheet, etc)
const debounce_timings = new Map<string, number>();
function debounce_trigger(hook_id: string, doc: foundry.abstract.Document<any, any>) {
  // Check for pending. Cancel if one exists
  let pending = debounce_timings.get(hook_id);
  if (pending) {
    clearTimeout(pending);
  }

  // Setup a new pending timeout and let it rip
  let new_pending = window.setTimeout(() => {
    Hooks.call(hook_id, doc);
  }, DEBOUNCE_TIMEOUT);
  debounce_timings.set(hook_id, new_pending);
}
