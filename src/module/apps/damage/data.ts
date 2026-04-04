import * as t from "io-ts";

import { LancerActor, LancerNPC } from "../../actor/lancer-actor";
import { DamageHudPlugin, DamageHudPluginCodec, DamageHudPluginData } from "./plugins/plugin";
import { enclass, encode, decode } from "../serde";
import { LancerItem } from "../../item/lancer-item";
import { LancerToken } from "../../token";
import { Tag } from "../../models/bits/tag";
import { DamageData } from "../../models/bits/damage";
import { DamageType, NpcFeatureType } from "../../enums";
import { LancerFlowState } from "../../flows/interfaces";

import { Nuke_1, Nuke_2 } from "./plugins/nuclearCavalier";
import Brutal_1 from "./plugins/brutal";
import Brawler_2 from "./plugins/brawler2";
import Juggernaut_2 from "./plugins/juggernaut2";

export type TotalDamage = {
  damage: DamageData[];
  bonusDamage: DamageData[];
};

export enum HitQuality {
  Miss = 0,
  Hit = 1,
  Crit = 2,
}
let hitSchema = t.union([t.literal(0), t.literal(1), t.literal(2)]);

/**
 * Utility function to ensure that raw data conforms to the DamageData spec
 * @param d The raw damage object
 * @returns A correctly typed DamageData object
 */
function ensureDamageType(d: { type: string; val: string }) {
  return {
    type: Object.keys(DamageType).includes(d.type) ? (d.type as DamageType) : DamageType.Kinetic,
    val: d.val,
  };
}

// so normally you wouldn't keep the codecs with the classes like this
// the entire point of io-ts is that the co/dec logic is separable
// but here we want plugins to actually modify the codecs, so, sigh
export class DamageHudWeapon {
  // These are the damage and bonus damage from the weapon+mod.
  // They are accumulated with whatever other damage is added to the base data
  damage: DamageData[];
  bonusDamage: DamageData[];
  reliable: boolean;
  reliableValue: number;
  overkill: boolean;
  #data!: DamageHudData; // never use this class before calling hydrate
  plugins: { [k: string]: DamageHudPluginData };

  static pluginSchema: { [k: string]: DamageHudPluginCodec<any, any, any> } = {};

  static get schema() {
    return {
      // TODO: how do you define an io-ts array schema using a TS type?
      // `type` should be a DamageType
      damage: t.array(t.type({ type: t.string, val: t.string })),
      bonusDamage: t.array(t.type({ type: t.string, val: t.string })),
      reliable: t.boolean,
      reliableValue: t.number,
      overkill: t.boolean,
      plugins: t.type(this.pluginSchema),
    };
  }

  static get schemaCodec() {
    return t.type(this.schema);
  }
  static get codec() {
    return enclass(this.schemaCodec, DamageHudWeapon);
  }

  constructor(obj: t.TypeOf<typeof DamageHudWeapon.schemaCodec>) {
    const objectDamage = obj.damage.map(ensureDamageType);
    const objBonusDamage = obj.bonusDamage.map(ensureDamageType);
    this.damage = objectDamage;
    this.bonusDamage = objBonusDamage;
    this.reliable = obj.reliable;
    this.reliableValue = obj.reliableValue;
    this.overkill = obj.overkill;
    this.plugins = obj.plugins;
  }

  get raw() {
    return {
      damage: this.damage,
      bonusDamage: this.bonusDamage,
      reliable: this.reliable,
      reliableValue: this.reliableValue,
      overkill: this.overkill,
      plugins: this.plugins,
    };
  }

  hydrate(d: DamageHudData) {
    for (let key of Object.keys(this.plugins)) {
      this.plugins[key].hydrate(d);
    }
    this.#data = d;
  }

  get total(): TotalDamage {
    //Adds on top of existing damage
    let damages = {
      damage: this.damage,
      bonusDamage: this.bonusDamage,
    };
    for (const plugin of Object.values(this.plugins)) {
      if (!plugin.modifyDamages) continue;
      damages = plugin.modifyDamages(damages);
    }

    return damages;
  }

  static parseReliableVal(tag: Tag, source?: LancerItem | LancerActor): number {
    // If the tag has no value, bail
    if (!tag.val) return 0;
    // Determine the tier to get, default to 1
    let tier = 1;
    if (source) {
      if (source instanceof LancerItem && source.actor?.is_npc()) {
        tier = source.actor.system.tier;
      } else if (source instanceof LancerActor && source.is_npc()) {
        tier = source.system.tier;
      }
    }
    // Get the tier value from the tag
    const tierValNum = parseInt(tag.tierVal(tier));
    if (Number.isNaN(tierValNum)) {
      return 0;
    }
    return tierValNum;
  }
}

export class DamageHudBase {
  tech: boolean;
  ap: boolean;
  paracausal: boolean;
  halfDamage: boolean;
  damage: DamageData[];
  bonusDamage: DamageData[];
  plugins: { [k: string]: DamageHudPluginData };
  #weapon?: DamageHudWeapon; // never use this class before calling hydrate

  static pluginSchema: { [k: string]: DamageHudPluginCodec<any, any, any> } = {};

  static get schema() {
    return {
      tech: t.boolean,
      ap: t.boolean,
      paracausal: t.boolean,
      halfDamage: t.boolean,
      // TODO: how do you define an io-ts array schema using a TS type?
      // `type` should be a DamageType
      damage: t.array(t.type({ type: t.string, val: t.string })),
      bonusDamage: t.array(t.type({ type: t.string, val: t.string })),
      plugins: t.type(this.pluginSchema),
    };
  }
  static get schemaCodec() {
    return t.type(this.schema);
  }
  static get codec() {
    return enclass(this.schemaCodec, DamageHudBase);
  }

  constructor(obj: t.TypeOf<typeof DamageHudBase.schemaCodec>) {
    const objectDamage = obj.damage.map(ensureDamageType);
    const objBonusDamage = obj.bonusDamage.map(ensureDamageType);
    this.tech = obj.tech;
    this.ap = obj.ap;
    this.paracausal = obj.paracausal;
    this.halfDamage = obj.halfDamage;
    this.damage = objectDamage;
    this.bonusDamage = objBonusDamage;
    this.plugins = obj.plugins;
  }

  get raw() {
    return {
      tech: this.tech,
      ap: this.ap,
      paracausal: this.paracausal,
      halfDamage: this.halfDamage,
      damage: this.damage,
      bonusDamage: this.bonusDamage,
      plugins: this.plugins,
    };
  }

  hydrate(d: DamageHudData) {
    this.#weapon = d.weapon;
    for (let key of Object.keys(this.plugins)) {
      this.plugins[key].hydrate(d, this);
    }
  }

  get total() {
    //Adds on top of existing damage
    let damages = {
      damage: this.damage,
      bonusDamage: this.bonusDamage,
    };
    for (const plugin of Object.values(this.plugins)) {
      if (!plugin.modifyDamages) continue;
      damages = plugin.modifyDamages(damages);
    }

    return damages;
  }
}

// we _want_ to extend DamageBase
// but ... typescript checks type compatibility between _static_ methods
// and that + io-ts I think has the variance wrong
// so if you extend DamageBase it's trying to assign DamageBase to DamageTarget
export class DamageHudTarget {
  target: LancerToken;
  hitResult: DamageHudHitResult;
  quality: HitQuality;
  ap: boolean;
  paracausal: boolean;
  halfDamage: boolean;
  bonusDamage: DamageData[];
  plugins: { [k: string]: any };
  #weapon?: DamageHudWeapon; // never use this class before calling hydrate
  #base!: DamageHudBase; // never use this class before calling hydrate

  static pluginSchema: { [k: string]: DamageHudPluginCodec<any, any, any> } = {};

  static get schema() {
    return {
      target_id: t.string,
      hitResult: DamageHudHitResult.codec,
      quality: t.number,
      ap: t.boolean,
      paracausal: t.boolean,
      halfDamage: t.boolean,
      bonusDamage: t.array(t.type({ type: t.string, val: t.string })),
      plugins: t.type(this.pluginSchema),
    };
  }

  static get schemaCodec() {
    return t.type(this.schema);
  }
  static get codec() {
    return enclass(this.schemaCodec, DamageHudTarget);
  }

  constructor(obj: t.TypeOf<typeof DamageHudTarget.schemaCodec>) {
    let target = canvas!.scene!.tokens.get(obj.target_id);
    if (!target) {
      ui.notifications!.error("Trying to access tokens from a different scene!");
      throw new Error("Token not found");
    }
    const objBonusDamage = obj.bonusDamage.map(ensureDamageType);

    this.target = target.object! as LancerToken;
    this.hitResult = obj.hitResult;
    this.quality = obj.quality;
    this.ap = obj.ap;
    this.paracausal = obj.paracausal;
    this.halfDamage = obj.halfDamage;
    this.bonusDamage = objBonusDamage;
    this.plugins = obj.plugins;
  }

  get raw() {
    return {
      target_id: this.target.id,
      hitResult: this.hitResult,
      quality: this.quality,
      ap: this.ap,
      paracausal: this.paracausal,
      halfDamage: this.halfDamage,
      bonusDamage: this.bonusDamage,
      plugins: this.plugins,
    };
  }

  static fromParams(
    t: Token,
    hitResult: DamageHudHitResult,
    data?: {
      quality?: HitQuality;
      ap?: boolean;
      paracausal?: boolean;
      halfDamage?: boolean;
      bonusDamage?: DamageData[];
    }
  ): DamageHudTarget {
    let ret = {
      target_id: t.id,
      hitResult,
      quality: data?.quality ?? HitQuality.Hit,
      ap: data?.ap || false,
      paracausal: data?.paracausal || false,
      halfDamage: data?.halfDamage || false,
      bonusDamage: data?.bonusDamage || [],
      plugins: {} as { [k: string]: any },
    };
    for (let plugin of DamageHudData.targetedPlugins) {
      ret.plugins[plugin.slug] = encode(plugin.perTarget!(t), plugin.codec);
    }
    return decode(ret, DamageHudTarget.codec);
  }

  hydrate(d: DamageHudData) {
    this.#weapon = d.weapon;
    this.#base = d.base;
    for (let key of Object.keys(this.plugins)) {
      this.plugins[key].hydrate(d, this);
    }
  }

  get total() {
    const base = this.#base.total;
    const weapon = this.#weapon?.total ?? {
      damage: [],
      bonusDamage: [],
    };

    //Plugins should modify it last because stuff like NucCav might be converting it
    let damages = {
      damage: [],
      bonusDamage: this.bonusDamage,
    };
    for (const plugin of Object.values(this.plugins)) {
      if (!plugin.modifyDamages) continue;
      damages = plugin.modifyDamages(damages, this);
    }

    return damages;
  }
}

// Simple class for storing the results of the attack roll which this damage roll is derived from.
// Needs to match LancerFlowState.HitResult, other than target being a UUID string instead of a
// hydrated token.
export class DamageHudHitResult {
  target: string; // token UUID
  base: string;
  total: string;
  usedLockOn: boolean;
  hit: boolean;
  crit: boolean;

  static get schema() {
    return {
      target: t.string,
      base: t.string,
      total: t.string,
      usedLockOn: t.boolean,
      hit: t.boolean,
      crit: t.boolean,
    };
  }

  static get schemaCodec() {
    return t.type(this.schema);
  }
  static get codec() {
    return enclass(this.schemaCodec, DamageHudHitResult);
  }

  constructor(obj: t.TypeOf<typeof DamageHudHitResult.schemaCodec>) {
    this.target = obj.target;
    this.base = obj.base;
    this.total = obj.total;
    this.usedLockOn = obj.usedLockOn;
    this.hit = obj.hit;
    this.crit = obj.crit;
  }

  get raw() {
    return {
      target: this.target,
      base: this.base,
      total: this.total,
      usedLockOn: this.usedLockOn,
      hit: this.hit,
      crit: this.crit,
    };
  }
}

export type DamageHudDataSerialized = t.OutputOf<typeof DamageHudData.schemaCodec>;
// TODO: this guy needs a new name
export class DamageHudData {
  title: string;
  weapon: DamageHudWeapon | undefined;
  base: DamageHudBase;
  hitResults: DamageHudHitResult[];
  targets: DamageHudTarget[];
  lancerItem?: LancerItem; // not persisted, needs to be hydrated
  lancerActor?: LancerActor; // not persisted, needs to be hydrated

  static get schema() {
    return {
      title: t.string,
      weapon: t.union([DamageHudWeapon.codec, t.undefined]),
      base: DamageHudBase.codec,
      hitResults: t.array(DamageHudHitResult.codec),
      targets: t.array(DamageHudTarget.codec),
    };
  }

  static get schemaCodec() {
    return t.type(this.schema);
  }
  static get codec() {
    return enclass(this.schemaCodec, DamageHudData);
  }

  constructor(obj: t.TypeOf<typeof DamageHudData.schemaCodec>) {
    this.title = obj.title;
    this.weapon = obj.weapon || undefined;
    this.base = obj.base;
    this.hitResults = obj.hitResults;
    this.targets = obj.targets;
    this.hydrate();
  }

  hydrate(runtimeData?: LancerItem | LancerActor) {
    if (runtimeData instanceof LancerItem) {
      this.lancerItem = runtimeData;
      this.lancerActor = runtimeData.actor ?? undefined;
    } else {
      this.lancerActor = runtimeData ?? undefined;
    }

    this.weapon?.hydrate(this);
    this.base.hydrate(this);
    for (let target of this.targets) {
      target.hydrate(this);
    }
  }

  replaceTargets(ts: Token[]): DamageHudData {
    let oldTargets: { [key: string]: DamageHudTarget } = {};
    for (let data of this.targets) {
      oldTargets[data.target.id] = data;
    }

    this.targets = ts.map(
      (t, idx) =>
        oldTargets[t.id] ??
        DamageHudTarget.fromParams(t, this.hitResults[idx], {
          quality: this.getHitQuality(t as LancerToken),
        })
    );

    for (let target of this.targets) {
      target.hydrate(this);
    }
    return this;
  }

  get sharedTotal(): TotalDamage {
    const weapon = this.weapon?.total ?? {
      damage: [],
      bonusDamage: [],
    };
    const base = this.base.total;

    return {
      damage: weapon.damage.concat(base.damage),
      bonusDamage: weapon.bonusDamage.concat(base.bonusDamage),
    };
  }

  get raw() {
    return {
      title: this.title,
      weapon: this.weapon,
      base: this.base,
      hitResults: this.hitResults,
      targets: this.targets,
    };
  }

  // Decode from a serialized object, optionally populating remaining data from an item
  static fromObject(obj: DamageHudDataSerialized, runtimeData?: LancerItem | LancerActor): DamageHudData {
    let ret = decode(obj, DamageHudData.codec);
    ret.hydrate(runtimeData);
    return ret;
  }

  toObject(): t.OutputOf<typeof DamageHudData.codec> {
    return encode(this, DamageHudData.codec);
  }

  static plugins: DamageHudPlugin<DamageHudPluginData>[] = [];
  static targetedPlugins: DamageHudPlugin<DamageHudPluginData>[] = [];
  static registerPlugin<D extends DamageHudPluginData, P extends DamageHudPlugin<D>>(plugin: P) {
    if (plugin.perRoll) {
      DamageHudWeapon.pluginSchema[plugin.slug] = plugin.codec;
    }
    if (plugin.perUnknownTarget) {
      DamageHudBase.pluginSchema[plugin.slug] = plugin.codec;
    }
    if (plugin.perTarget) {
      DamageHudTarget.pluginSchema[plugin.slug] = plugin.codec;
      this.targetedPlugins.push(plugin);
    }
    this.plugins.push(plugin);
  }

  static getHitQuality(t: LancerToken, hitResults: DamageHudHitResult[]) {
    if (!hitResults || !hitResults.length) return HitQuality.Hit;
    const hit = (hitResults || []).find(hr => hr.target === t.document.uuid);
    if (!hit) return HitQuality.Hit;
    // Pick the quality which matches the hit result's hit/crit flags
    if (hit.crit) return HitQuality.Crit;
    if (hit.hit) return HitQuality.Hit;
    return HitQuality.Miss;
  }
  getHitQuality(t: LancerToken) {
    return DamageHudData.getHitQuality(t, this.hitResults);
  }

  static fromParams(
    runtimeData?: LancerItem | LancerActor,
    data?: {
      tags?: Tag[];
      title?: string;
      targets?: LancerToken[];
      hitResults?: LancerFlowState.HitResult[];
      ap?: boolean;
      paracausal?: boolean;
      halfDamage?: boolean;
      tech?: boolean;
      starting?: { damage?: DamageData[]; bonusDamage?: DamageData[] };
    }
  ): DamageHudData {
    let weapon = {
      damage: [] as DamageData[],
      bonusDamage: [] as DamageData[],
      reliable: false,
      reliableValue: 0,
      overkill: false,
      plugins: {} as { [k: string]: any },
    };
    let base = {
      tech: data?.tech ?? false,
      ap: data?.ap ?? false,
      paracausal: data?.paracausal ?? false,
      halfDamage: data?.halfDamage ?? false,
      damage: data?.starting?.damage ?? [],
      bonusDamage: data?.starting?.bonusDamage ?? [],
      plugins: {} as { [k: string]: any },
    };

    for (let tag of data?.tags || []) {
      switch (tag.lid) {
        case "tg_ap":
          base.ap = true;
          break;
        case "tg_overkill":
          weapon.overkill = true;
          break;
        case "tg_reliable":
          weapon.reliable = true;
          weapon.reliableValue = DamageHudWeapon.parseReliableVal(tag, runtimeData);
      }
    }

    if (runtimeData instanceof LancerItem) {
      if (runtimeData.is_mech_weapon()) {
        const profile = runtimeData.system.active_profile;
        weapon.damage = profile.damage;
        weapon.bonusDamage = profile.bonus_damage;
      } else if (runtimeData.is_npc_feature() && runtimeData.system.type === NpcFeatureType.Weapon) {
        const actor = runtimeData.actor as LancerNPC | null;
        const tier = (actor?.system.tier || 1) - 1;
        weapon.damage = runtimeData.system.damage[tier];
      } else if (runtimeData.is_pilot_weapon()) {
        weapon.damage = runtimeData.system.damage;
      }
    }

    const hitResults = (data?.hitResults || []).map(
      hr => new DamageHudHitResult({ ...hr, target: hr.target.document.uuid })
    );

    let obj: DamageHudDataSerialized = {
      title: data?.title ? data.title : "Damage Roll",
      weapon,
      base,
      hitResults,
      targets: (data?.targets || []).map((t, idx) => {
        let ret = {
          target_id: t.id,
          hitResult: hitResults[idx],
          quality: DamageHudData.getHitQuality(t, hitResults),
          ap: base.ap,
          paracausal: base.paracausal,
          halfDamage: base.halfDamage,
          bonusDamage: [],
          plugins: {} as { [k: string]: any },
        };
        for (let plugin of this.targetedPlugins) {
          ret.plugins[plugin.slug] = encode(plugin.perTarget!(t), plugin.codec);
        }
        return ret;
      }),
    };

    for (let plugin of this.plugins) {
      if (plugin.perRoll && obj.weapon) {
        obj.weapon.plugins[plugin.slug] = encode(plugin.perRoll(runtimeData), plugin.codec);
      }
      if (plugin.perUnknownTarget) {
        obj.base.plugins[plugin.slug] = encode(plugin.perUnknownTarget(), plugin.codec);
      }
    }

    // for now this isn't using DamageTarget.fromParams, which means the code is duplicated
    // that's a relatively contained bit of tech debt, but let's handle it next time this is touched
    return DamageHudData.fromObject(obj, runtimeData);
  }
}

//We need to register plugins after settings are initialized
DamageHudData.registerPlugin(Nuke_1);
DamageHudData.registerPlugin(Nuke_2);
DamageHudData.registerPlugin(Brutal_1);
DamageHudData.registerPlugin(Brawler_2);
DamageHudData.registerPlugin(Juggernaut_2);
