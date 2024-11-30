import { EntryType } from "../enums";
import { fromLidSync } from "./from-lid";

const icon_mapping = {
  [EntryType.BOND]: "mdi mdi-vector-link",
  [EntryType.CORE_BONUS]: "cci cci-corebonus",
  [EntryType.DEPLOYABLE]: "cci cci-deployable",
  [EntryType.FRAME]: "cci cci-frame",
  [EntryType.LICENSE]: "cci cci-license",
  [EntryType.MECH]: "cci cci-frame",
  [EntryType.MECH_SYSTEM]: "cci cci-system",
  [EntryType.MECH_WEAPON]: "cci cci-weapon",
  [EntryType.NPC]: "cci cci-npc-class",
  [EntryType.NPC_CLASS]: "cci cci-npc-class",
  [EntryType.NPC_FEATURE]: "cci cci-npc-feature",
  [EntryType.NPC_TEMPLATE]: "cci cci-npc-template",
  [EntryType.ORGANIZATION]: "cci cci-encounter",
  [EntryType.PILOT]: "cci cci-pilot",
  [EntryType.PILOT_ARMOR]: "mdi mdi-shield-outline",
  [EntryType.PILOT_GEAR]: "cci cci-generic-item",
  [EntryType.PILOT_WEAPON]: "cci cci-weapon",
  [EntryType.RESERVE]: "cci cci-reserve-tac",
  [EntryType.SKILL]: "cci cci-skill",
  [EntryType.STATUS]: "cci cci-reticule",
  [EntryType.TALENT]: "cci cci-talent",
  [EntryType.WEAPON_MOD]: "cci cci-weaponmod",
  base: undefined,
} as const;

export function addEnrichers() {
  CONFIG.TextEditor.enrichers = CONFIG.TextEditor.enrichers.concat([
    {
      pattern: /@LancerID\[(.+?)\](?:{(.+?)})?/gm,
      enricher: async (match: string[], _opts: unknown) => {
        const lid = match[1];
        const name: string | undefined = match[2];
        // Ideally, in the future, we'll have a way to get an initial index with the correct fields
        await Promise.all(game.packs.filter(p => ["Actor", "Item"].includes(p.documentName)).map(db => db.getIndex()));
        let doc = fromLidSync(lid);
        const data: TextEditor.EnrichmentAnchorOptions & {
          attrs: Record<string, string>;
          classes: string[];
          dataset: Record<string, string>;
        } = {
          classes: ["content-link"],
          attrs: { draggable: "true" },
          dataset: { link: "", lid },
          name,
        };
        if (doc) {
          if (doc instanceof foundry.abstract.Document)
            return doc.toAnchor({ name: data.name, icon: icon_mapping[doc.type], dataset: { lid } });
          data.name ??= doc.name || lid;
          const doc_type = game.packs.get(doc.pack)?.documentName ?? "Item";
          data.dataset.type = doc_type;
          data.dataset.id = doc._id;
          data.dataset.pack = doc.pack;
          data.dataset.uuid = doc.uuid;
          data.icon = icon_mapping[doc.type] ?? CONFIG[doc_type].sidebarIcon;
        } else {
          delete data.dataset.link;
          delete data.attrs.draggable;
          data.classes.push("broken");
          data.icon = "fas fa-unlink";
        }
        // @ts-expect-error Typo in types library
        return TextEditor.createAnchor(data);
      },
    },
  ]);
}
