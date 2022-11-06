import type { LancerActor } from "../actor/lancer-actor";
import type { LancerItem } from "../item/lancer-item";

/**
 * Retrieve a Document by its Lancer ID
 * @param lid    - The Lancer ID to look up
 * @param source - Where to look for the item
 */
export async function fromLid(lid: string, source: "all" | "world" | "compendium" = "all") {
  const search_world = source === "all" || source === "world";
  const search_compendium = source === "all" || source === "compendium";

  let document: unknown;
  if (search_world)
    // @ts-expect-error v10
    document = game.items?.find(i => i.system.lid === lid) ?? game.actors?.find(a => a.system.lid === lid);

  if (!document && search_compendium) {
    const databases = game.packs.filter(p => ["Actor", "Item"].includes(p.documentName));
    await Promise.all(databases.map(d => d.getIndex()));
    document = (
      await Promise.all(
        databases.map(db => {
          // @ts-expect-error v10
          const { _id: doc_id } = db.index.find(i => i.system?.lid === lid) ?? {};
          return db.getDocument(doc_id ?? "");
        })
      )
    ).find(e => e !== undefined);
  }

  return document as LancerActor | LancerItem | undefined;
}

/**
 * Retrieve a Document by its Lancer ID synchronously. If the id
 * resolves to a compendium, returns that document's index instead. If
 * the index has not been regenerated to contain lids, only the world
 * collections will be searched.
 * @param lid    - The Lancer ID to look up
 * @param source - Where to look for the item
 */
export function fromLidSync(lid: string, source: "all" | "world" | "compendium" = "all") {
  const search_world = source === "all" || source === "world";
  const search_compendium = source === "all" || source === "compendium";

  let document: unknown;

  if (search_world)
    // @ts-expect-error v10
    document = game.items?.find(i => i.system.lid === lid) ?? game.actors?.find(a => a.system.lid === lid);

  if (!document && search_compendium) {
    const databases = game.packs.filter(p => ["Actor", "Item"].includes(p.documentName));

    document = databases
      .map(db => {
        // @ts-expect-error v10
        const doc = db.index.find(i => i.system?.lid === lid);
        if (doc) (<any>doc).pack = db.collection;
        return doc;
      })
      .find(e => e !== undefined);
  }

  return document as
    | LancerActor
    | LancerItem
    | {
        _id: string;
        img: string;
        name: string;
        pack: string;
        sort: number;
        type: string;
        system: { lid: string };
      }
    | undefined;
}
