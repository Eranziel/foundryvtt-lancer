// Migration utility functions

import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import type { SourceData, SourceTemplates } from "../source-template";
import type { PackedNpcClassStats } from "./unpacking/packed-types";

// Looks through the raw game.data for probable lid matches. Returns a UUID
function coarseLIDtoUUID(lid: string): string | null {
  let actor = game.data.actors?.find(x => x.system?.lid == lid);
  if (actor?._id) {
    return `Actor.${actor._id}`;
  }
  let item = game.data.items?.find(x => x.system?.lid == lid);
  if (item?._id) {
    return `Item.${item._id}`;
  }
  return null;
}

// Used in many datamodel migrations. Imperfect, but we can only do this sync, so fuck us I guess lmao
export function regRefToUuid(doc_type: "Item" | "Actor" | "ActiveEffect", rr: any): null | string {
  // Handle null case
  if (!rr) return null;
  // Handle identity case
  if (typeof rr == "string") return rr;
  if (!rr.id && rr.fallback_lid) {
    // We can at least look at raw world data
    return coarseLIDtoUUID(rr.fallback_lid);
  } else if (!rr.id || !rr.reg_name) {
    // Non recoverable without lid or compendium name
    return null;
  } else if (rr.reg_name == "comp_core") {
    // There is no way to recover this synchronously, unfortunately
    return null;
  } else if (rr.reg_name == "game") {
    // World entities are quite simple
    return `${doc_type}.${rr.id}`;
  } else if (rr.reg_name.startsWith("game|")) {
    // As are inventory items
    return `Actor.${rr.reg_name.split("game|")[1]}.Item.${rr.id}`;
  } else {
    console.error("Failed to process regref", rr);
    return null; // Unhandled
  }
}

export function regRefToId(doc_type: "Item" | "Actor" | "ActiveEffect", rr: any): null | string {
  // Try using parent function
  let base = regRefToUuid(doc_type, rr);
  if (base) {
    let parts = base.split(".");
    return parts[parts.length - 1];
  }
  return null;
}

export function regRefToLid(rr: any): null | string {
  // Handle null case
  if (!rr) return null;
  if (typeof rr == "string") return rr;
  return rr.fallback_lid || null;
}

/** Converts a stat array from compcon/old lancer standard to modern standards */
export function convertNpcStats(raw_data: Record<string, any>): DeepPartial<SourceData.NpcClass["base_stats"]> {
  let stats: DeepPartial<SourceData.NpcClass["base_stats"]> = [];

  // Go through either all keys, or present keys, depending on shim_missing.
  // Order sort of matters - put less correct keys earlier, as they will be overwritten in case of a conflict
  let key_map = {
    activations: "activations",
    agility: "agi",
    agi: "agi",
    armor: "armor",
    edef: "edef",
    evade: "evasion",
    evasion: "evasion",
    engineering: "eng",
    eng: "eng",
    heatcap: "heatcap",
    hp: "hp",
    hull: "hull",
    save: "save",
    sensor: "sensor_range",
    sensor_range: "sensor_range",
    size: "size",
    speed: "speed",
    stress: "stress",
    structure: "structure",
    systems: "sys",
    sys: "sys",
  } as Record<keyof SourceTemplates.NPC.StatBlock | keyof PackedNpcClassStats, keyof SourceTemplates.NPC.StatBlock>;

  for (let i = 0; i < 3; i++) {
    // Extreme data coersion go! We can accept any of number, number[], or number[][]. Return null on failure
    const giv = (key: keyof SourceTemplates.NPC.StatBlock | keyof PackedNpcClassStats) => {
      // Certain types
      let x: number | number[] | number[][] | null = raw_data[key] ?? null;
      if (!(typeof x == "number" || Array.isArray(x))) return null; // Sanity escape
      x = Array.isArray(x) ? x : [x]; // number -> number[]
      x = x.length == 0 ? [0] : x; // [] -> [0]
      let y = i >= x.length ? x[x.length - 1] : x[i]; // get closest element of x to our tier index
      let z = Array.isArray(y) ? y[0] : y; // if it's still an array (e.g. original was number[][]), just take first element. we don't handle that
      if (typeof z != "number") return null; // Second sanity check
      return z;
    };

    // Go through either all keys, or present keys
    let record: SourceTemplates.NPC.StatBlock = {} as any;
    for (let k of Object.keys(raw_data) as Array<keyof PackedNpcClassStats>) {
      let v = giv(k);
      if (v) record[key_map[k]] = v;
    }
    stats.push(record);
  }
  return stats;
}
