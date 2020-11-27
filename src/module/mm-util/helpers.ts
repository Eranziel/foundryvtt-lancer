import { EntryType, LiveEntryTypes, OpCtx, Registry } from "machine-mind";
import type { LancerActor } from "../actor/lancer-actor";
import type { LancerActorType, LancerItemType } from "../config";
import type { LancerItem } from "../item/lancer-item";
import { FoundryReg } from "./foundry-reg";

// Provides an environment for interacting with a provided item.
// The registry is whatever registry is most sensibly "local" for the given item. If the item is from a compendium, the reg will be compendium local.
// If the item is from an actor, then the registry will be for that actor
// Otherwise (item is global / item is an actor), we do standard global space
export interface MMEntityContext<T extends EntryType> {
    reg: Registry;
    ctx: OpCtx; // Could just fetch from item but this cleaner
    live_item: LiveEntryTypes<T>;
}

export async function mm_wrap_item<T extends EntryType & LancerItemType>(item: LancerItem<T>): Promise<MMEntityContext<T>> {
    // Figure out what our context ought to be
    let is_compendium = item.compendium != null; // If compendium is set, we use that
    let actor: LancerActor<any> | null = item.options.actor ?? null; // If actor option is set, we use that

    // Get our reg
    let reg = new FoundryReg({for_compendium: is_compendium, for_actor: actor})
    let ctx = new OpCtx();

    // Load up the item. This _should_ always work
    let live_item = await reg.get_cat(item.type).get_live(ctx, item._id) as LiveEntryTypes<T>;
    if(!live_item) {
        throw new Error("Something went wrong while trying to contextualize an item...");
    }

    return {
        ctx,
        reg,
        live_item
    }
}

export async function mm_wrap_actor<T extends EntryType & LancerActorType>(actor: LancerActor<T>): Promise<MMEntityContext<T>> {
    // Figure out what our context ought to be
    let is_compendium = actor.compendium != null; // If compendium is set, we use that

    // Get our reg
    let reg = new FoundryReg({for_compendium: is_compendium, for_actor: actor})
    let ctx = new OpCtx();

    // Load up the item. This _should_ always work barring exceptional race conditions (like, deleting the actor while opening the sheet) 
    let live_item = await reg.get_cat(actor.data.type).get_live(ctx, actor._id) as LiveEntryTypes<T>;
    if(!live_item) {
        throw new Error("Something went wrong while trying to contextualize an actor...");
    }

    return {
        ctx,
        reg,
        live_item
    }
}