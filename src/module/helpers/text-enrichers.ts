import { fromLidSync } from "./from-lid";

//@ts-expect-error v10
CONFIG.TextEditor.enrichers = CONFIG.TextEditor.enrichers.concat([
  {
    pattern: /@LancerID\[(.+?)\](?:{(.+?)})?/g,
    enricher: async (match: string[], _opts: unknown) => {
      const lid = match[1];
      const label: string | undefined = match[2];
      // Ideally, in the future, we'll have a way to get an initial index with the correct fields
      await Promise.all(game.packs.filter(p => ["Actor", "Item"].includes(p.documentName)).map(db => db.getIndex()));
      let doc = fromLidSync(lid);
      const data = {
        cls: ["content-link"],
        icon: undefined as string | undefined,
        dataset: {} as Record<string, string>,
        name: label,
      };
      if (doc) {
        if (doc instanceof foundry.abstract.Document) {
          // @ts-expect-error v10
          return doc.toAnchor({ attrs: { draggable: true }, classes: data.cls, name: data.name });
        }
        data.name ??= doc.name || lid;
        const doc_type = game.packs.get(doc.pack)?.documentName ?? "Item";
        data.dataset.type = doc_type;
        data.dataset.id = doc._id;
        data.dataset.pack = doc.pack;
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
