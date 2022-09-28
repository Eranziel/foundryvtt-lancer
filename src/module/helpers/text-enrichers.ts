import type { LancerActor } from "../actor/lancer-actor";
import type { LancerItem } from "../item/lancer-item";

//@ts-expect-error v10
CONFIG.TextEditor.enrichers = CONFIG.TextEditor.enrichers.concat([
  {
    pattern: /@LancerID\[(.+?)\](?:{(.+?)})?/g,
    enricher: async (match: string[], _opts: unknown) => {
      const lid = match[1];
      const label: string | undefined = match[2];
      let doc:
        | LancerActor
        | LancerItem
        | { _id: string; img: string; name: string; sort: number; system: { lid: string } }
        // @ts-expect-error V10
        | undefined = game.items?.find(i => i.system.lid === lid) ?? game.actors?.find(a => a.system.lid === lid);
      let databases = game.packs.filter(p => ["Actor", "Item"].includes(p.documentName));
      const data = {
        cls: ["content-link"],
        icon: undefined as string | undefined,
        dataset: {} as Record<string, string>,
        name: label,
      };
      while (!doc && databases.length > 0) {
        const db = databases.pop();
        if (!db) continue;
        const index = await db.getIndex();
        // @ts-expect-error V10
        doc = index.find(i => i.system.lid === lid);
        // @ts-expect-error v10
        if (doc) data.dataset.pack = db.metadata.id;
      }
      if (doc) {
        if (doc instanceof foundry.abstract.Document) {
          // @ts-expect-error v10
          return doc.toAnchor({ attrs: { draggable: true }, classes: data.cls, name: data.name });
        }
        data.name ??= doc.name || lid;
        const doc_type = game.packs.get(data.dataset.pack)?.documentName ?? "Item";
        data.dataset.type = doc_type;
        data.dataset.id = doc._id;
        data.dataset.uuid = `Compendium.${data.dataset.pack}.${doc._id}`;
        data.icon = CONFIG[doc_type].sidebarIcon;
      } else {
        data.cls.push("broken");
        data.icon = "fas fa-unlink";
      }
      const a = document.createElement("a");
      a.classList.add(...data.cls);
      a.draggable = true;
      Object.entries(data.dataset).forEach(([k, v]) => (a.dataset[k] = v));
      a.innerHTML = `<i class="${data.icon}"></i>${data.name}`;
      return a;
    },
  },
]);
