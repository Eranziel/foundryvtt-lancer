import * as t from "io-ts";

import type { LancerActor } from "../../actor/lancer-actor";
import { DamageHudPlugin, DamageHudPluginCodec, DamageHudPluginData } from "./plugin";
import { enclass, encode, decode } from "../acc_diff/serde";
import { LancerItem } from "../../item/lancer-item";
import { LancerToken } from "../../token";
import { Tag } from "../../models/bits/tag";
import { DamageData } from "../../models/bits/damage";

// so normally you wouldn't keep the codecs with the classes like this
// the entire point of io-ts is that the co/dec logic is separable
// but here we want plugins to actually modify the codecs, so, sigh
export class DamageHudWeapon {
  ap: boolean;
  paracausal: boolean;
  halfDamage: boolean;
  // damage: DamageData[];
  // bonusDamage: DamageData[];
  #data!: DamageHudData; // never use this class before calling hydrate
  plugins: { [k: string]: DamageHudPluginData };

  static pluginSchema: { [k: string]: DamageHudPluginCodec<any, any, any> } = {};

  static get schema() {
    return {
      ap: t.boolean,
      paracausal: t.boolean,
      halfDamage: t.boolean,
      // damage: t.array(DamageData),
      // bonusDamage: t.array(DamageData),
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
    this.ap = obj.ap;
    this.paracausal = obj.paracausal;
    this.halfDamage = obj.halfDamage;
    // this.damage = obj.damage;
    // this.bonusDamage = obj.bonusDamage;
    this.plugins = obj.plugins;
  }

  get raw() {
    return {
      ap: this.ap,
      paracausal: this.paracausal,
      halfDamage: this.halfDamage,
      // damage: this.damage,
      // bonusDamage: this.bonusDamage,
      plugins: this.plugins,
    };
  }

  // TODO: refactor to damage specs
  // total(cover: number) {
  //   return (this.accurate ? 1 : 0) - (this.inaccurate ? 1 : 0) - (this.seeking ? 0 : cover) - (this.impaired ? 1 : 0);
  // }

  hydrate(d: DamageHudData) {
    for (let key of Object.keys(this.plugins)) {
      this.plugins[key].hydrate(d);
    }
    this.#data = d;
  }
}

export class DamageHudBase {
  // accuracy: number;
  // difficulty: number;
  // cover: Cover;
  plugins: { [k: string]: DamageHudPluginData };
  #weapon!: DamageHudWeapon; // never use this class before calling hydrate

  static pluginSchema: { [k: string]: DamageHudPluginCodec<any, any, any> } = {};

  static get schema() {
    return {
      // accuracy: t.number,
      // difficulty: t.number,
      // cover: coverSchema,
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
    // this.accuracy = obj.accuracy;
    // this.difficulty = obj.difficulty;
    // this.cover = obj.cover;
    this.plugins = obj.plugins;
  }

  get raw() {
    return {
      // accuracy: this.accuracy,
      // difficulty: this.difficulty,
      // cover: this.cover,
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
    return 0; // this.accuracy - this.difficulty// + this.#weapon.total(this.cover);
  }
}

// we _want_ to extend DamageBase
// but ... typescript checks type compatibility between _static_ methods
// and that + io-ts I think has the variance wrong
// so if you extend DamageBase it's trying to assign DamageBase to DamageTarget
export class DamageHudTarget {
  target: LancerToken;
  // accuracy: number;
  // difficulty: number;
  // cover: Cover;
  // consumeLockOn: boolean;
  plugins: { [k: string]: any };
  #weapon!: DamageHudWeapon; // never use this class before calling hydrate
  #base!: DamageHudBase; // never use this class before calling hydrate

  static pluginSchema: { [k: string]: DamageHudPluginCodec<any, any, any> } = {};

  static get schema() {
    return {
      target_id: t.string,
      // accuracy: t.number,
      // difficulty: t.number,
      // cover: coverSchema,
      // consumeLockOn: t.boolean,
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

    this.target = target.object! as LancerToken;
    // this.accuracy = obj.accuracy;
    // this.difficulty = obj.difficulty;
    // this.cover = obj.cover;
    // this.consumeLockOn = obj.consumeLockOn;
    this.plugins = obj.plugins;

    // this.#weapon = weapon;
    // this.#base = base;
  }

  get raw() {
    return {
      target_id: this.target.id,
      // accuracy: this.accuracy,
      // difficulty: this.difficulty,
      // cover: this.cover,
      // consumeLockOn: this.consumeLockOn,
      plugins: this.plugins,
    };
  }

  static fromParams(t: Token): DamageHudTarget {
    let ret = {
      target_id: t.id,
      // accuracy: 0,
      // difficulty: 0,
      // cover: Cover.None,
      // consumeLockOn: true,
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

  get usingLockOn(): null | boolean {
    return null; //(this.consumeLockOn && this.lockOnAvailable) || null;
  }

  get lockOnAvailable(): null | boolean {
    return !!this.target.actor?.system.statuses.lockon;
  }

  get total() {
    let base = 0; //this.accuracy - this.difficulty + this.#weapon.total(this.cover);
    // the only thing we actually use base for is the untyped bonuses
    let raw = base; // + this.#base.accuracy - this.#base.difficulty;
    // let lockon = this.usingLockOn ? 1 : 0;

    return raw; // + lockon;
  }
}

export type DamageHudDataSerialized = t.OutputOf<typeof DamageHudData.schemaCodec>;
// TODO: this guy needs a new name
export class DamageHudData {
  title: string;
  weapon: DamageHudWeapon;
  base: DamageHudBase;
  targets: DamageHudTarget[];
  lancerItem?: LancerItem; // not persisted, needs to be hydrated
  lancerActor?: LancerActor; // not persisted, needs to be hydrated

  static get schema() {
    return {
      title: t.string,
      weapon: DamageHudWeapon.codec,
      base: DamageHudBase.codec,
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
    this.weapon = obj.weapon;
    this.base = obj.base;
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

    this.weapon.hydrate(this);
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

    this.targets = ts.map(t => oldTargets[t.id] ?? DamageHudTarget.fromParams(t));

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

  static fromParams(
    runtimeData?: LancerItem | LancerActor,
    tags?: Tag[],
    title?: string,
    targets?: Token[],
    starting?: [number, number] | number
  ): DamageHudData {
    let weapon = {
      ap: false,
      paracausal: false,
      halfDamage: false,
      plugins: {} as { [k: string]: any },
    };

    // Fix number to array
    if (!starting) {
      starting = [0, 0];
    } else if (typeof starting == "number") {
      starting = starting >= 0 ? [starting, 0] : [0, -starting];
    }

    for (let tag of tags || []) {
      switch (tag.lid) {
        case "tg_ap":
          weapon.ap = true;
          break;
      }
    }
    // TODO: check for paracausal and half damage

    let base = {
      // cover: Cover.None,
      // accuracy: starting[0],
      // difficulty: starting[1],
      plugins: {} as { [k: string]: any },
    };

    let obj: DamageHudDataSerialized = {
      title: title ? title : "Accuracy and Difficulty",
      weapon,
      base,
      targets: (targets || []).map(t => {
        let ret = {
          target_id: t.id,
          // accuracy: 0,
          // difficulty: 0,
          // cover: Cover.None,
          consumeLockOn: true,
          plugins: {} as { [k: string]: any },
        };
        for (let plugin of this.targetedPlugins) {
          ret.plugins[plugin.slug] = encode(plugin.perTarget!(t), plugin.codec);
        }
        return ret;
      }),
    };

    for (let plugin of this.plugins) {
      if (plugin.perRoll) {
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
