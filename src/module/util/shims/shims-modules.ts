declare module "@massif/lancer-data" {
  const actions: any;
  const backgrounds: any;
  const core_bonuses: any;
  const environments: any;
  const factions: any;
  const frames: any;
  const glossary: any;
  const info: any;
  const manufacturers: any;
  const mods: any;
  const npc_classes: any;
  const npc_features: any;
  const npc_templates: any;
  const pilot_gear: any;
  const reserves: any;
  const rules: any;
  const sitreps: any;
  const skills: any;
  const statuses: any;
  const systems: any;
  const tables: any;
  const tags: any;
  const talents: any;
  const weapons: any;
}

// TODO: remove this when v10 types
declare function fromUuidSync(uuid: string): foundry.abstract.Document<any, any> | null;
