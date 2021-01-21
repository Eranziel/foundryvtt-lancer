import { LANCER,} from "../config";
const lp = LANCER.log_prefix;
import { EntryType, LiveEntryTypes, RegEntry, Registry, RegRef } from "machine-mind";
import { LancerActor, LancerActorType } from "../actor/lancer-actor";
import { LancerItem, LancerItemType } from "../item/lancer-item";

type RegEntity<T extends EntryType> = Entity | RegEntry<T> | RegRef<T>;

export class LancerHooks {
    
    static call(entity: Entity) {
        var id: string = entity.id
        console.log(`${lp} Publishing ${id}`)       
        return Hooks.call(id, entity)
    }

    static on<E extends Entity>(entity: E, callback: (arg: E) => any): LancerSubscription
    static on<T extends LancerActorType>(entity: RegEntity<T>, callback: (arg: LancerActor<T>) => any): LancerSubscription
    static on<T extends LancerItemType>(entity: RegEntity<T>, callback: (arg: LancerItem<T>) => any): LancerSubscription

    static on<T extends EntryType>(entity: RegEntity<T>, callback: (arg: any) => any): LancerSubscription {
        var id: string
        if (entity instanceof RegEntry) {
            id = entity.RegistryID
        }
        else {
            id = entity.id
        }
        console.log(`${lp} Subscribing to ${id}`)
        let subId = Hooks.on(id, callback)
        return new LancerSubscription(id, subId)
    }

    static off(sub: LancerSubscription): void
    static off(entity: RegEntity<any>, callback: number): void
    static off(entity: RegEntity<any>, callback: (arg: Entity) => any): void
    static off<T extends LancerActorType>(entity: RegEntity<T>, callback: (arg: LancerActor<T>) => any): void
    static off<T extends LancerItemType>(entity: RegEntity<T>, callback: (arg: LancerItem<T>) => any): void

    static off(entityOrSub: LancerSubscription | RegEntity<any>, callback?: number | ((arg: any) => any)): void
    {
        var id: string
        if (entityOrSub instanceof LancerSubscription) {
            return entityOrSub.unsubscribe()
        }
        else if (entityOrSub instanceof RegEntry) {
            id = entityOrSub.RegistryID
        }
        else {
            id = entityOrSub.id
        }
        if (callback) {
            console.log(`${lp} Unsubscribing from ${id}`)
            //@ts-ignore Pending Bolts' code merger, hooks types are incorrect
            return Hooks.off(id, callback)
        }
    }
}

/**
 * A helper class for easily handling LancerHook subscriptions.
 * Store this when it is returned from LancerHook.on() and use unsubscribe() to remove the hook.
 */
export class LancerSubscription {
    private name: string
    private id: number

    constructor(name: string, id: number) {
        this.name = name
        this.id = id
    }

    unsubscribe() {
        //@ts-ignore Pending Bolts' code merger, hooks types are incorrect
        Hooks.off(this.name, this.id)
    }
}