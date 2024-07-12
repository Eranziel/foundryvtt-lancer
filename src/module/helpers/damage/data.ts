import * as t from "io-ts";

import type { LancerActor } from "../../actor/lancer-actor";
import type { AccDiffPlugin, AccDiffPluginData, AccDiffPluginCodec } from "./plugin";
import { enclass, encode, decode } from "./serde";
import { LancerItem } from "../../item/lancer-item";

import Invisibility from "./invisibility";
import Spotter from "./spotter";
import { LancerToken } from "../../token";
import { Tag } from "../../models/bits/tag";

export enum Cover {
  None = 0,
  Soft = 1,
  Hard = 2,
}
let coverSchema = t.union([t.literal(0), t.literal(1), t.literal(2)]);

// so normally you wouldn't keep the codecs with the classes like this
// the entire point of io-ts is that the co/dec logic is separable
// but here we want plugins to actually modify the codecs, so, sigh
export class AccDiffWeapon {
  accurate: boolean;
  inaccurate: boolean;
  seeking: boolean;
  #data!: AccDiffData; // never use this class before calling hydrate
  plugins: { [k: string]: AccDiffPluginData };

  static pluginSchema: { [k: string]: AccDiffPluginCodec<any, any, any> } = {};

  static get schema() {
    return {
      accurate: t.boolean,
      inaccurate: t.boolean,
      seeking: t.boolean,
      plugins: t.type(this.pluginSchema),
    };
  }

  static get schemaCodec() {
    return t.type(this.schema);
  }
  static get codec() {
    return enclass(this.schemaCodec, AccDiffWeapon);
  }

  constructor(obj: t.TypeOf<typeof AccDiffWeapon.schemaCodec>) {
    this.accurate = obj.accurate;
    this.inaccurate = obj.inaccurate;
    this.seeking = obj.seeking;
    this.plugins = obj.plugins;
  }

  get raw() {
    return {
      accurate: this.accurate,
      inaccurate: this.inaccurate,
      seeking: this.seeking,
      plugins: this.plugins,
    };
  }

  get impaired(): ActiveEffect | null {
    // @ts-expect-error
    return !!this.#data?.lancerActor?.system?.statuses.impaired;
  }

  total(cover: number) {
    return (this.accurate ? 1 : 0) - (this.inaccurate ? 1 : 0) - (this.seeking ? 0 : cover) - (this.impaired ? 1 : 0);
  }

  hydrate(d: AccDiffData) {
    for (let key of Object.keys(this.plugins)) {
      this.plugins[key].hydrate(d);
    }
    this.#data = d;
  }
}

export class AccDiffBase {
  accuracy: number;
  difficulty: number;
  cover: Cover;
  plugins: { [k: string]: AccDiffPluginData };
  #weapon!: AccDiffWeapon; // never use this class before calling hydrate

  static pluginSchema: { [k: string]: AccDiffPluginCodec<any, any, any> } = {};

  static get schema() {
    return {
      accuracy: t.number,
      difficulty: t.number,
      cover: coverSchema,
      plugins: t.type(this.pluginSchema),
    };
  }
  static get schemaCodec() {
    return t.type(this.schema);
  }
  static get codec() {
    return enclass(this.schemaCodec, AccDiffBase);
  }

  constructor(obj: t.TypeOf<typeof AccDiffBase.schemaCodec>) {
    this.accuracy = obj.accuracy;
    this.difficulty = obj.difficulty;
    this.cover = obj.cover;
    this.plugins = obj.plugins;
    // this.#weapon = weapon;
  }

  get raw() {
    return { accuracy: this.accuracy, difficulty: this.difficulty, cover: this.cover, plugins: this.plugins };
  }

  hydrate(d: AccDiffData) {
    this.#weapon = d.weapon;
    for (let key of Object.keys(this.plugins)) {
      this.plugins[key].hydrate(d, this);
    }
  }

  get total() {
    return this.accuracy - this.difficulty + this.#weapon.total(this.cover);
  }
}

// we _want_ to extend AccDiffBase
// but ... typescript checks type compatibility between _static_ methods
// and that + io-ts I think has the variance wrong
// so if you extend AccDiffBase it's trying to assign AccDiffBase to AccDiffTarget
export class AccDiffTarget {
  target: LancerToken;
  accuracy: number;
  difficulty: number;
  cover: Cover;
  consumeLockOn: boolean;
  plugins: { [k: string]: any };
  #weapon!: AccDiffWeapon; // never use this class before calling hydrate
  #base!: AccDiffBase; // never use this class before calling hydrate

  static pluginSchema: { [k: string]: AccDiffPluginCodec<any, any, any> } = {};

  static get schema() {
    return {
      target_id: t.string,
      accuracy: t.number,
      difficulty: t.number,
      cover: coverSchema,
      consumeLockOn: t.boolean,
      plugins: t.type(this.pluginSchema),
    };
  }

  static get schemaCodec() {
    return t.type(this.schema);
  }
  static get codec() {
    return enclass(this.schemaCodec, AccDiffTarget);
  }

  constructor(obj: t.TypeOf<typeof AccDiffTarget.schemaCodec>) {
    let target = canvas!.scene!.tokens.get(obj.target_id);
    if (!target) {
      ui.notifications!.error("Trying to access tokens from a different scene!");
      throw new Error("Token not found");
    }

    this.target = target.object! as LancerToken;
    this.accuracy = obj.accuracy;
    this.difficulty = obj.difficulty;
    this.cover = obj.cover;
    this.consumeLockOn = obj.consumeLockOn;
    this.plugins = obj.plugins;
    // this.#weapon = weapon;
    // this.#base = base;
  }

  get raw() {
    return {
      target_id: this.target.id,
      accuracy: this.accuracy,
      difficulty: this.difficulty,
      cover: this.cover,
      consumeLockOn: this.consumeLockOn,
      plugins: this.plugins,
    };
  }

  static fromParams(t: Token): AccDiffTarget {
    let ret = {
      target_id: t.id,
      accuracy: 0,
      difficulty: 0,
      cover: Cover.None,
      consumeLockOn: true,
      plugins: {} as { [k: string]: any },
    };
    for (let plugin of AccDiffData.targetedPlugins) {
      ret.plugins[plugin.slug] = encode(plugin.perTarget!(t), plugin.codec);
    }
    return decode(ret, AccDiffTarget.codec);
  }

  hydrate(d: AccDiffData) {
    this.#weapon = d.weapon;
    this.#base = d.base;
    for (let key of Object.keys(this.plugins)) {
      this.plugins[key].hydrate(d, this);
    }
  }

  get usingLockOn(): null | boolean {
    return (this.consumeLockOn && this.lockOnAvailable) || null;
  }

  get lockOnAvailable(): null | boolean {
    return !!this.target.actor?.system.statuses.lockon;
  }

  get total() {
    let base = this.accuracy - this.difficulty + this.#weapon.total(this.cover);
    // the only thing we actually use base for is the untyped bonuses
    let raw = base + this.#base.accuracy - this.#base.difficulty;
    let lockon = this.usingLockOn ? 1 : 0;

    return raw + lockon;
  }
}

export type AccDiffDataSerialized = t.OutputOf<typeof AccDiffData.schemaCodec>;
export class AccDiffData {
  title: string;
  weapon: AccDiffWeapon;
  base: AccDiffBase;
  targets: AccDiffTarget[];
  lancerItem?: LancerItem; // not persisted, needs to be hydrated
  lancerActor?: LancerActor; // not persisted, needs to be hydrated

  static get schema() {
    return {
      title: t.string,
      weapon: AccDiffWeapon.codec,
      base: AccDiffBase.codec,
      targets: t.array(AccDiffTarget.codec),
    };
  }

  static get schemaCodec() {
    return t.type(this.schema);
  }
  static get codec() {
    return enclass(this.schemaCodec, AccDiffData);
  }

  constructor(obj: t.TypeOf<typeof AccDiffData.schemaCodec>) {
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

  replaceTargets(ts: Token[]): AccDiffData {
    let oldTargets: { [key: string]: AccDiffTarget } = {};
    for (let data of this.targets) {
      oldTargets[data.target.id] = data;
    }

    this.targets = ts.map(t => oldTargets[t.id] ?? AccDiffTarget.fromParams(t));

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
  static fromObject(obj: AccDiffDataSerialized, runtimeData?: LancerItem | LancerActor): AccDiffData {
    let ret = decode(obj, AccDiffData.codec);
    ret.hydrate(runtimeData);
    return ret;
  }

  toObject(): t.OutputOf<typeof AccDiffData.codec> {
    return encode(this, AccDiffData.codec);
  }

  static plugins: AccDiffPlugin<AccDiffPluginData>[] = [];
  static targetedPlugins: AccDiffPlugin<AccDiffPluginData>[] = [];
  static registerPlugin<D extends AccDiffPluginData, P extends AccDiffPlugin<D>>(plugin: P) {
    if (plugin.perRoll) {
      AccDiffWeapon.pluginSchema[plugin.slug] = plugin.codec;
    }
    if (plugin.perUnknownTarget) {
      AccDiffBase.pluginSchema[plugin.slug] = plugin.codec;
    }
    if (plugin.perTarget) {
      AccDiffTarget.pluginSchema[plugin.slug] = plugin.codec;
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
  ): AccDiffData {
    let weapon = {
      accurate: false,
      inaccurate: false,
      seeking: false,
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
        case "tg_accurate":
          weapon.accurate = true;
          break;
        case "tg_inaccurate":
          weapon.inaccurate = true;
          break;
        case "tg_seeking":
          weapon.seeking = true;
          break;
      }
    }

    let base = {
      cover: Cover.None,
      accuracy: starting[0],
      difficulty: starting[1],
      plugins: {} as { [k: string]: any },
    };

    let obj: AccDiffDataSerialized = {
      title: title ? title : "Accuracy and Difficulty",
      weapon,
      base,
      targets: (targets || []).map(t => {
        let ret = {
          target_id: t.id,
          accuracy: 0,
          difficulty: 0,
          cover: Cover.None,
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

    // for now this isn't using AccDiffTarget.fromParams, which means the code is duplicated
    // that's a relatively contained bit of tech debt, but let's handle it next time this is touched
    return AccDiffData.fromObject(obj, runtimeData);
  }
}

// side effects for importing, yes, yes, I know
AccDiffData.registerPlugin(Invisibility);
AccDiffData.registerPlugin(Spotter);
