import { EntryType, LiveEntryTypes, OpCtx, Registry } from "machine-mind";
import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { FoundryReg } from "./foundry-reg";

// Provides an environment for interacting with a provided item.
// The registry is whatever registry is most sensibly "local" for the given item. If the item is from a compendium, the reg will be compendium local.
// If the item is from an actor, then the registry will be for that actor
// Otherwise (item is global / item is an actor), we do standard global space
export interface ItemContext<T extends EntryType> {
    reg: Registry;
    ctx: OpCtx; // Could just fetch from item but this cleaner
    foundry_item: LancerItem<T>;
    live_item: LiveEntryTypes<T>;
}


export async function contextualize_item<T extends EntryType>(item: LancerItem<T>): Promise<ItemContext<T>> {
    // Figure out what our context ought to be
    let is_compendium = item.compendium != null; // If compendium is set, we use that
    let actor: LancerActor | null = item.options.actor ?? null; // If actor option is set, we use that

    // Get our reg
    let reg = new FoundryReg({for_compendium: is_compendium, for_actor: actor})
    let ctx = new OpCtx();

    // Load up the item. This _should_ always work
    let live_item = await reg.get_cat(item.type).get_live(ctx, item._id) as LiveEntryTypes<T>;

    return {
        ctx,
        reg,
        live_item,
        foundry_item: item
    }
}