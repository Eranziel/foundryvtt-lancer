import { EntryType, LiveEntryTypes, OpCtx, Registry } from "machine-mind";
import type { LancerActor, LancerActorType } from "../actor/lancer-actor";
import type { LancerItem, LancerItemType } from "../item/lancer-item";
import { FoundryReg } from "./foundry-reg";

// Provides an environment for interacting with a provided item.
// The registry is whatever registry is most sensibly "local" for the given item. If the item is from a compendium, the reg will be compendium local.
// If the item is from an actor, then the registry will be for that actor
// Otherwise (item is global / item is an actor), we do standard global space
export interface MMEntityContext<T extends EntryType> {
  reg: Registry;
  ctx: OpCtx; // Could just fetch from item but this cleaner
  ent: LiveEntryTypes<T>;
}

export async function mm_wrap_item<T extends EntryType & LancerItemType>(
  item: LancerItem<T>
): Promise<MMEntityContext<T>> {
  // Figure out what our context ought to be
  let is_compendium = item.compendium != null; // If compendium is set, we use that
  let actor: LancerActor<any> | null = item.options.actor ?? null; // If actor option is set, we use that
  let token: Token | null = actor?.token ?? null;

  // Get our reg. Actor arg doesn't really matter - we default to world
  let reg: FoundryReg;
  if(is_compendium) {
    // Is top level compendium item
    reg = new FoundryReg({
      actor_source: "compendium",
      item_source: ["compendium", null]
    });
  } else if(token) { 
    // Is a token owned item
    reg = new FoundryReg({
      actor_source: "token", // Makes sense to provide tokens I guess? Doesn't seem incredibly relevant
      item_source: ["token", token]
    });
  } else if(actor) {
    // Is an actor owned item
    reg = new FoundryReg({
      actor_source: "world",
      item_source: ["actor", actor]
    });
  } else {
    // Is a world item
    reg = new FoundryReg({
      actor_source: "world",
      item_source: ["world", null]
    });
  }
  let ctx = new OpCtx();

  // Load up the item. This _should_ always work
  let ent = (await reg.get_cat(item.type).get_live(ctx, item._id)) as LiveEntryTypes<T>;
  if (!ent) {
    throw new Error("Something went wrong while trying to contextualize an item...");
  }

  return {
    ctx,
    reg,
    ent: ent,
  };
}

export async function mm_wrap_actor<T extends EntryType & LancerActorType>(
  actor: LancerActor<T>
): Promise<MMEntityContext<T>> {
  // Get our reg
  let reg: FoundryReg;
  let id: string;
  if(actor.isToken) {
    reg = new FoundryReg({
      actor_source: "token",
      item_source: ["token", actor.token]
    });
    id = actor.token.id;
  } else if(actor.compendium) {
    reg = new FoundryReg({
      actor_source: "compendium",
      item_source: ["actor", actor]
    });
    id = actor.id;
  } else {
    reg = new FoundryReg({
      actor_source: "world",
      item_source: ["actor", actor]
    });
    id = actor.id;
  }
  let ctx = new OpCtx();

  // Load up the item. This _should_ always work barring exceptional race conditions (like, deleting the actor while opening the sheet)
  let ent = (await reg.get_cat(actor.data.type).get_live(ctx, id)) as LiveEntryTypes<T>;
  if (!ent) {
    throw new Error("Something went wrong while trying to contextualize an actor...");
  }

  return {
    ctx,
    reg,
    ent: ent,
  };
}