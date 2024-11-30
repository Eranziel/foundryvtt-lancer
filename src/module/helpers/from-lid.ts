import type { LancerActor } from "../actor/lancer-actor";
import { EntryType } from "../enums";
import type { LancerItem } from "../item/lancer-item";

/**
 * Interface for the destructured options to fromLid and fromLidSync.
 */
interface FromLidOpts {
  /**
   * Where to look for the item
   * @default "all"
   */
  source: "all" | "world" | "compendium";
}

/**
 * Retrieve a list of documents by their Lancer IDs
 * @param lids   - The Lancer IDs to look up
 * @param source -  Where to look for the item
 */
export async function fromLidMany(lids: string[], { source = "all" }: Partial<FromLidOpts> = {}) {
  const search_world = source !== "compendium";
  const search_compendium = source !== "world";

  let docs: unknown[] = [];
  if (search_world)
    docs.push(
      ...(game.items?.filter(i => lids.includes(i.system.lid)) as unknown[]),
      ...(game.actors?.filter(a => lids.includes(a.system.lid)) as unknown[])
    );

  if (search_compendium) {
    const databases = game.packs.filter(p => ["Actor", "Item"].includes(p.documentName));
    await Promise.all(databases.map(d => d.getIndex()));
    docs.push(...(await Promise.all(databases.map(d => d.getDocuments({ system: { lid__in: lids } })))).flat());
  }

  return docs as (LancerActor | LancerItem | undefined)[];
}

/**
 * Retrieve a Document by its Lancer ID
 * @param lid    - The Lancer ID to look up
 * @param source - Where to look for the item
 */
export async function fromLid(lid: string, { source = "all" }: Partial<FromLidOpts> = {}) {
  return (await fromLidMany([lid], { source })).shift();
}

/**
 * Retrieve a Document by its Lancer ID synchronously. If the id
 * resolves to a compendium, returns that document's index instead. If
 * the index has not been regenerated to contain lids, only the world
 * collections will be searched.
 * @param lid    - The Lancer ID to look up
 * @param source - Where to look for the item
 */
export function fromLidSync(lid: string, { source = "all" }: Partial<FromLidOpts> = {}) {
  const search_world = source !== "compendium";
  const search_compendium = source !== "world";

  let document: unknown;

  if (search_world)
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
        folder: string;
        img: string;
        name: string;
        pack: string;
        sort: number;
        system: { lid: string };
        type: EntryType;
        uuid: string;
      }
    | undefined;
}
