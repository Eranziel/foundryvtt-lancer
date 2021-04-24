import { LANCER } from "../config";
const lp = LANCER.log_prefix;
import { EntryType, LiveEntryTypes, RegEntry, Registry, RegRef } from "machine-mind";
import { LancerActor, LancerActorType } from "../actor/lancer-actor";
import { LancerItem, LancerItemType } from "../item/lancer-item";

export const DEBOUNCE_TIMEOUT = 500; // An update propagation hook will fire at most once every this many MS.
// Triggers on falling edge (meaning will wait for updates to stop pouring in before firing
type RegEntity<T extends EntryType> = Entity | RegEntry<T> | RegRef<T>;

export class LancerHooks {
  static call(entity: Entity) {
    var id: string = entity.id;
    // return Hooks.call(id, entity)
    debounce_trigger(id, entity);
  }

  static on<E extends Entity>(entity: E, callback: (arg: E) => any): LancerSubscription;
  static on<T extends LancerActorType>(
    entity: RegEntity<T>,
    callback: (arg: LancerActor<T>) => any
  ): LancerSubscription;
  static on<T extends LancerItemType>(
    entity: RegEntity<T>,
    callback: (arg: LancerItem<T>) => any
  ): LancerSubscription;

  static on<T extends EntryType>(
    entity: RegEntity<T>,
    callback: (arg: any) => any
  ): LancerSubscription {
    var id: string;
    if (entity instanceof RegEntry) {
      id = entity.RegistryID;
    } else {
      id = entity.id;
    }
    let subId = Hooks.on(id, callback);
    return new LancerSubscription(id, subId);
  }

  static off(sub: LancerSubscription): void;
  static off(entity: RegEntity<any>, callback: number): void;
  static off(entity: RegEntity<any>, callback: (arg: Entity) => any): void;
  static off<T extends LancerActorType>(
    entity: RegEntity<T>,
    callback: (arg: LancerActor<T>) => any
  ): void;
  static off<T extends LancerItemType>(
    entity: RegEntity<T>,
    callback: (arg: LancerItem<T>) => any
  ): void;

  static off(
    entityOrSub: LancerSubscription | RegEntity<any>,
    callback?: number | ((arg: any) => any)
  ): void {
    var id: string;
    if (entityOrSub instanceof LancerSubscription) {
      return entityOrSub.unsubscribe();
    } else if (entityOrSub instanceof RegEntry) {
      id = entityOrSub.RegistryID;
    } else {
      id = entityOrSub.id;
    }
    if (callback) {
      //@ts-ignore Pending Bolts' code merger, hooks types are incorrect
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
    //@ts-ignore Pending Bolts' code merger, hooks types are incorrect
    Hooks.off(this.name, this.id);
  }
}

// Given the number of things that can trigger a hook, we debounce to make sure we're only really sending out one signal per set of updates (including user mashing + on a sheet, etc)
const debounce_timings = new Map<string, number>();
function debounce_trigger(hook_id: string, entity: Entity) {
  // Check for pending. Cancel if one exists
  let pending = debounce_timings.get(hook_id);
  if (pending) {
    clearTimeout(pending);
  }

  // Setup a new pending timeout and let it rip
  let new_pending = window.setTimeout(() => {
    Hooks.call(hook_id, entity);
  }, DEBOUNCE_TIMEOUT);
  debounce_timings.set(hook_id, new_pending);
}
