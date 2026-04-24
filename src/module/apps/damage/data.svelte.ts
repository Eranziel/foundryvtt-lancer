import { LancerActor, type LancerNPC } from "../../actor/lancer-actor";
import type { DamageHudPlugin, DamageHudPluginData } from "./plugin";
import { LancerItem } from "../../item/lancer-item";
import { LancerToken } from "../../token";
import { Tag } from "../../models/bits/tag";
import type { DamageData } from "../../models/bits/damage";
import { DamageType, NpcFeatureType } from "../../enums";
import { LancerFlowState } from "../../flows/interfaces";

import { LANCER } from "../../config";
import { tokenDocFromUuidSync } from "../../util/misc";
const lp = LANCER.log_prefix;

export enum HitQuality {
  Miss = 0,
  Hit = 1,
  Crit = 2,
}

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

export interface DamageHudWeaponParams {
  damage: DamageData[];
  bonusDamage: DamageData[];
  reliable: boolean;
  reliableValue: number;
  overkill: boolean;
  plugins: { [k: string]: DamageHudPluginData };
}
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

  static plugins: { [k: string]: DamageHudPlugin<any> } = {};

  constructor(obj: DamageHudWeaponParams) {
    const objectDamage = obj.damage.map(ensureDamageType);
    const objBonusDamage = obj.bonusDamage.map(ensureDamageType);
    this.damage = $state(objectDamage);
    this.bonusDamage = $state(objBonusDamage);
    this.reliable = $state(obj.reliable);
    this.reliableValue = $state(obj.reliableValue);
    this.overkill = $state(obj.overkill);
    this.plugins = $state(obj.plugins);
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

  get total() {
    return { damage: this.damage, bonusDamage: this.bonusDamage };
  }

  static parseReliableVal(tag: Tag, source?: LancerItem | LancerActor): number {
    // If the tag has no value, bail
    if (!tag.val) return 0;
    // Determine the tier to get, default to 1
    let tier = 1;
    if (source) {
      if (source instanceof LancerItem && source.actor?.is_npc()) {
        tier = source.actor.system.tier || 1;
      } else if (source instanceof LancerActor && source.is_npc()) {
        tier = source.system.tier || 1;
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

export interface DamageHudBaseParams {
  ap: boolean;
  paracausal: boolean;
  halfDamage: boolean;
  damage: DamageData[];
  bonusDamage: DamageData[];
  plugins: { [k: string]: DamageHudPluginData };
}
export class DamageHudBase {
  ap: boolean;
  paracausal: boolean;
  halfDamage: boolean;
  damage: DamageData[];
  bonusDamage: DamageData[];
  plugins: { [k: string]: DamageHudPluginData };
  #weapon?: DamageHudWeapon; // never use this class before calling hydrate

  // Derived properties
  total: { damage: DamageData[]; bonusDamage: DamageData[] };

  static plugins: { [k: string]: DamageHudPlugin<any> } = {};

  constructor(obj: DamageHudBaseParams) {
    const objectDamage = obj.damage.map(ensureDamageType);
    const objBonusDamage = obj.bonusDamage.map(ensureDamageType);
    this.ap = $state(obj.ap);
    this.paracausal = $state(obj.paracausal);
    this.halfDamage = $state(obj.halfDamage);
    this.damage = $state(objectDamage);
    this.bonusDamage = $state(objBonusDamage);
    this.plugins = $state(obj.plugins);

    this.total = $derived(this._total());
  }

  get raw() {
    return {
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
      this.plugins[key].hydrate(d);
    }
  }

  _total() {
    const weaponTotal = this.#weapon?.total || { damage: [], bonusDamage: [] };
    return {
      damage: weaponTotal.damage.concat(this.damage),
      bonusDamage: weaponTotal.bonusDamage.concat(this.bonusDamage),
    };
  }
}

export interface DamageHudTargetParams extends DamageHudBaseParams {
  targetUuid: string;
  quality: HitQuality;
}
export class DamageHudTarget extends DamageHudBase {
  targetUuid: string;
  targetName: string;
  targetImg: string;
  quality: HitQuality;
  #weapon?: DamageHudWeapon; // never use this class before calling hydrate
  #base!: DamageHudBase; // never use this class before calling hydrate

  constructor(obj: DamageHudTargetParams) {
    if (obj.damage.length) {
      console.warn(`${lp} Non-bonus damage was provided for damage target, but will be ignored.`);
    }
    // We don't support target-specific non-bonus damage, so make sure it's cleared to avoid unintended effects.
    obj.damage = [];
    super(obj);

    if (obj.targetUuid && !canvas!.scene!.tokens.find(t => t.uuid === obj.targetUuid)) {
      ui.notifications.error("Trying to access tokens from a different scene!");
      throw new Error(`Token ${obj.targetUuid} not found in the active scene`);
    }

    this.targetUuid = $state(obj.targetUuid);
    const token = tokenDocFromUuidSync(this.targetUuid, { strict: true });
    this.targetName = $derived(token?.name || "");
    this.targetImg = $derived(token?.actor?.img || "");
    this.quality = $state(obj.quality);
  }

  get raw() {
    return {
      targetUuid: this.targetUuid,
      quality: this.quality,
      ap: this.ap,
      paracausal: this.paracausal,
      damage: [],
      halfDamage: this.halfDamage,
      bonusDamage: this.bonusDamage,
      plugins: this.plugins,
    };
  }

  static fromParams(
    t: Token.Implementation,
    data?: {
      quality?: HitQuality;
      ap?: boolean;
      paracausal?: boolean;
      halfDamage?: boolean;
      bonusDamage?: DamageData[];
    }
  ): DamageHudTarget {
    let ret: DamageHudTargetParams = {
      targetUuid: t.document.uuid,
      quality: data?.quality ?? HitQuality.Hit,
      ap: data?.ap || false,
      paracausal: data?.paracausal || false,
      halfDamage: data?.halfDamage || false,
      damage: [],
      bonusDamage: data?.bonusDamage || [],
      plugins: {} as { [k: string]: any },
    };
    for (let plugin of DamageHudData.targetedPlugins) {
      ret.plugins[plugin.slug] = plugin.perTarget!(t);
    }
    return new DamageHudTarget(ret);
  }

  hydrate(d: DamageHudData) {
    this.#weapon = d.weapon;
    this.#base = d.base;
    for (let key of Object.keys(this.plugins)) {
      this.plugins[key].hydrate(d, this);
    }
  }

  _total() {
    const baseTotal = this.#base.total;
    return {
      damage: baseTotal.damage,
      bonusDamage: this.bonusDamage.concat(baseTotal.bonusDamage),
    };
  }
}

export interface DamageHudHitResultParams {
  targetUuid: string; // token UUID
  total: string;
  usedLockOn: boolean;
  hit: boolean;
  crit: boolean;
}
/**
 * Simple class for storing the results of the attack roll which this damage roll is derived from.
 * Needs to match LancerFlowState.HitResult, other than target being a UUID string instead of a
 * hydrated token.
 */
class DamageHudHitResult {
  targetUuid: string; // token UUID
  total: string;
  usedLockOn: boolean;
  hit: boolean;
  crit: boolean;

  constructor(obj: DamageHudHitResultParams) {
    this.targetUuid = $state(obj.targetUuid);
    this.total = $state(obj.total);
    this.usedLockOn = $state(obj.usedLockOn);
    this.hit = $state(obj.hit);
    this.crit = $state(obj.crit);
  }

  get raw(): DamageHudHitResultParams {
    return {
      targetUuid: this.targetUuid,
      total: this.total,
      usedLockOn: this.usedLockOn,
      hit: this.hit,
      crit: this.crit,
    };
  }
}

export interface DamageHudDataParams {
  title: string;
  weapon?: DamageHudWeaponParams;
  base: DamageHudBaseParams;
  hitResults: DamageHudHitResultParams[];
  targets: DamageHudTargetParams[];
  runtimeData?: string; // LancerActor or LancerItem uuid
}
export class DamageHudData {
  title: string;
  weapon: DamageHudWeapon;
  base: DamageHudBase;
  hitResults: DamageHudHitResult[];
  targets: DamageHudTarget[];
  lancerItem?: LancerItem; // not persisted, needs to be hydrated
  lancerActor?: LancerActor; // not persisted, needs to be hydrated

  constructor(obj: DamageHudDataParams) {
    this.title = $state(obj.title);
    this.weapon = $state(
      new DamageHudWeapon(
        obj.weapon || {
          overkill: false,
          reliable: false,
          reliableValue: 0,
          damage: [],
          bonusDamage: [],
          plugins: {},
        }
      )
    );
    this.base = $state(new DamageHudBase(obj.base));
    this.hitResults = $state(obj.hitResults.map(hitResult => new DamageHudHitResult(hitResult)));
    this.targets = $state(obj.targets.map(target => new DamageHudTarget(target)));
    this.hydrate();
  }

  hydrate(runtimeData?: LancerItem | LancerActor | unknown) {
    if (runtimeData instanceof LancerItem) {
      this.lancerItem = runtimeData;
      this.lancerActor = runtimeData.actor ?? undefined;
    } else if (runtimeData instanceof LancerActor) {
      this.lancerActor = runtimeData ?? undefined;
    }

    this.weapon?.hydrate(this);
    this.base.hydrate(this);
    for (let target of this.targets) {
      target.hydrate(this);
    }
  }

  replaceTargets(newTargets: string[]): DamageHudData {
    const oldTargets: { [key: string]: DamageHudTarget } = {};
    for (let target of this.targets) {
      oldTargets[target.targetUuid] = target;
    }

    // Delete targets which have been untargeted
    for (let i = this.targets.length - 1; i >= 0; i--) {
      if (i < 0) break;
      const target = this.targets[i];
      if (!newTargets.some(t => t === target.targetUuid)) {
        this.targets.splice(i, 1);
      }
    }
    // Either update-in-place or push new targets into the array
    for (const target of newTargets) {
      const token: Token.Implementation | null = tokenDocFromUuidSync(target, { strict: true })?.object || null;
      if (!token) continue;
      const existingTarget = this.targets.find(t => t.targetUuid === target);
      // New target, add to array
      if (!existingTarget) {
        this.targets.push(DamageHudTarget.fromParams(token));
      }
    }

    for (let target of this.targets) {
      target.hydrate(this);
    }
    return this;
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
  static fromObject(obj: DamageHudDataParams, runtimeData?: LancerItem | LancerActor): DamageHudData {
    let ret = new this(obj);
    ret.hydrate(runtimeData);
    return ret;
  }

  static plugins: DamageHudPlugin<DamageHudPluginData>[] = [];
  static targetedPlugins: DamageHudPlugin<DamageHudPluginData>[] = [];
  static registerPlugin<D extends DamageHudPluginData, P extends DamageHudPlugin<D>>(plugin: P) {
    if (plugin.perRoll) {
      DamageHudWeapon.plugins[plugin.slug] = plugin;
    }
    if (plugin.perUnknownTarget) {
      DamageHudBase.plugins[plugin.slug] = plugin;
    }
    if (plugin.perTarget) {
      DamageHudTarget.plugins[plugin.slug] = plugin;
      this.targetedPlugins.push(plugin);
    }
    this.plugins.push(plugin);
  }

  static getHitQuality(t: LancerToken, hitResults: DamageHudHitResult[]) {
    if (!hitResults || !hitResults.length) return HitQuality.Hit;
    const hit = (hitResults || []).find(hr => hr.targetUuid === t.document.uuid);
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
      hr => new DamageHudHitResult({ ...hr, targetUuid: hr.target.document.uuid })
    );

    let obj: DamageHudDataParams = {
      title: data?.title ? data.title : "Damage Roll",
      weapon,
      base,
      hitResults: hitResults.map(hr => hr.raw),
      targets: (data?.targets || []).map(t => {
        let ret = {
          targetUuid: t.document.uuid,
          quality: DamageHudData.getHitQuality(t, hitResults),
          ap: base.ap,
          paracausal: base.paracausal,
          halfDamage: base.halfDamage,
          damage: [],
          bonusDamage: [],
          plugins: {} as { [k: string]: any },
        };
        for (let plugin of this.targetedPlugins) {
          ret.plugins[plugin.slug] = plugin.perTarget!(t);
        }
        return ret;
      }),
    };

    for (let plugin of this.plugins) {
      if (plugin.perRoll && obj.weapon) {
        obj.weapon.plugins[plugin.slug] = plugin.perRoll(runtimeData);
      }
      if (plugin.perUnknownTarget) {
        obj.base.plugins[plugin.slug] = plugin.perUnknownTarget();
      }
    }

    // for now this isn't using DamageTarget.fromParams, which means the code is duplicated
    // that's a relatively contained bit of tech debt, but let's handle it next time this is touched
    return DamageHudData.fromObject(obj, runtimeData);
  }
}
