import type { AccDiffHudPlugin, AccDiffHudPluginData } from "./plugin";
import { LancerActor } from "../../actor/lancer-actor";
import { LancerItem } from "../../item/lancer-item";

import Invisibility from "./invisibility";
import Spotter from "./spotter";
import { Tag } from "../../models/bits/tag";

export enum Cover {
  None = 0,
  Soft = 1,
  Hard = 2,
}

export function tokenDocFromUuidSync(
  uuid: string,
  options?: { strict?: boolean }
): TokenDocument.Implementation | null {
  // @ts-expect-error out of date type for fromUuidSync
  const token = fromUuidSync(uuid, options);
  if (!(token instanceof TokenDocument.implementation)) return null;
  return token;
}

export type AccDiffHudWeaponParams = {
  accurate: boolean;
  inaccurate: boolean;
  seeking: boolean;
  engaged: boolean;
  plugins: { [k: string]: AccDiffHudPluginData };
};

export class AccDiffHudWeapon {
  accurate: boolean;
  inaccurate: boolean;
  seeking: boolean;
  engaged: boolean;
  #data!: AccDiffHudData; // never use this class before calling hydrate
  plugins: { [k: string]: AccDiffHudPluginData };

  static plugins: { [k: string]: AccDiffHudPlugin<any> } = {};

  constructor(obj: AccDiffHudWeaponParams) {
    this.accurate = $state(obj.accurate);
    this.inaccurate = $state(obj.inaccurate);
    this.seeking = $state(obj.seeking);
    this.engaged = $state(obj.engaged);
    this.plugins = $state(obj.plugins);
  }

  get raw() {
    return {
      accurate: this.accurate,
      inaccurate: this.inaccurate,
      seeking: this.seeking,
      engaged: this.engaged,
      plugins: this.plugins,
    };
  }

  get impaired(): boolean {
    return !!this.#data?.lancerActor?.system?.statuses.impaired;
  }

  get engagedStatus(): boolean {
    return !!this.#data?.lancerActor?.system?.statuses.engaged;
  }

  total(cover: number) {
    return (
      (this.accurate ? 1 : 0) -
      (this.inaccurate ? 1 : 0) -
      (this.seeking ? 0 : cover) -
      (this.impaired ? 1 : 0) -
      (this.engaged ? 1 : 0)
    );
  }

  hydrate(d: AccDiffHudData) {
    for (let key of Object.keys(this.plugins)) {
      if (this.plugins[key].hydrate) this.plugins[key].hydrate(d);
    }
    this.#data = d;
  }
}

export interface AccDiffHudBaseParams {
  grit: number;
  flatBonus: number;
  accuracy: number;
  difficulty: number;
  cover: Cover;
  plugins: { [k: string]: AccDiffHudPluginData };
}

export class AccDiffHudBase {
  grit: number;
  flatBonus: number;
  accuracy: number;
  difficulty: number;
  cover: Cover;
  plugins: { [k: string]: AccDiffHudPluginData };
  #weapon!: AccDiffHudWeapon; // never use this class before calling hydrate

  static plugins: { [k: string]: AccDiffHudPlugin<any> } = {};

  // Derived properties
  total: number;

  constructor(obj: AccDiffHudBaseParams) {
    this.grit = $state(obj.grit);
    this.flatBonus = $state(obj.flatBonus);
    this.accuracy = $state(obj.accuracy);
    this.difficulty = $state(obj.difficulty);
    this.cover = $state(obj.cover);
    this.plugins = $state(obj.plugins);

    this.total = $derived(this._total());
  }

  get raw() {
    return {
      grit: this.grit,
      flatBonus: this.flatBonus,
      accuracy: this.accuracy,
      difficulty: this.difficulty,
      cover: this.cover,
      plugins: this.plugins,
    };
  }

  hydrate(d: AccDiffHudData) {
    this.#weapon = d.weapon;
    for (let key of Object.keys(this.plugins)) {
      if (this.plugins[key].hydrate) this.plugins[key].hydrate(d);
    }
  }

  _total() {
    return this.accuracy - this.difficulty + this.#weapon.total(this.cover);
  }
}

export interface AccDiffHudTargetParams extends AccDiffHudBaseParams {
  targetUuid: string;
  consumeLockOn: boolean;
  prone: boolean;
  stunned: boolean;
}

export class AccDiffHudTarget extends AccDiffHudBase {
  targetUuid: string;
  targetName: string;
  targetImg: string;
  consumeLockOn: boolean;
  prone: boolean;
  stunned: boolean;
  #weapon!: AccDiffHudWeapon; // never use this class before calling hydrate
  #base!: AccDiffHudBase; // never use this class before calling hydrate

  // Derived properties
  usingLockOn: boolean | null;
  lockOnAvailable: boolean | null;

  static plugins: { [k: string]: AccDiffHudPlugin<any> } = {};

  constructor(obj: AccDiffHudTargetParams) {
    super(obj);
    if (obj.targetUuid && !canvas!.scene!.tokens.find(t => t.uuid === obj.targetUuid)) {
      ui.notifications!.error("Trying to access tokens from a different scene!");
      throw new Error("Token not found");
    }

    this.targetUuid = $state(obj.targetUuid);
    const token = tokenDocFromUuidSync(this.targetUuid, { strict: true });
    this.targetName = $derived(token?.name || "");
    this.targetImg = $derived(token?.actor?.img || "");
    this.consumeLockOn = $state(obj.consumeLockOn);
    this.prone = $state(obj.prone);
    this.stunned = $state(obj.stunned);
    this.lockOnAvailable = $state(token?.actor?.system.statuses.lockon || null);
    this.usingLockOn = $derived((this.consumeLockOn && this.lockOnAvailable) || null);
  }

  get raw(): AccDiffHudTargetParams {
    const base = super.raw;
    return {
      ...base,
      targetUuid: this.targetUuid,
      consumeLockOn: this.consumeLockOn,
      prone: this.prone,
      stunned: this.stunned,
      plugins: this.plugins,
    };
  }

  static fromParams(t: Token.Implementation): AccDiffHudTarget {
    let cover = Cover.None;
    if (t.actor?.statuses.has("cover_hard")) {
      cover = Cover.Hard;
    } else if (t.actor?.statuses.has("cover_soft")) {
      cover = Cover.Soft;
    }
    let ret: AccDiffHudTargetParams = {
      targetUuid: t.document.uuid,
      // TODO: grit and flatBonus should get provided by base
      grit: 0,
      flatBonus: 0,
      accuracy: 0,
      difficulty: 0,
      cover,
      consumeLockOn: true,
      prone: t.actor?.system.statuses.prone || false,
      stunned: t.actor?.system.statuses.stunned || false,
      plugins: {},
    };
    for (let plugin of AccDiffHudData.targetedPlugins) {
      ret.plugins[plugin.slug] = plugin.perTarget!(t);
    }
    return new AccDiffHudTarget(ret);
  }

  hydrate(d: AccDiffHudData) {
    this.#weapon = d.weapon;
    this.#base = d.base;
    for (let key of Object.keys(this.plugins)) {
      if (this.plugins[key].hydrate) this.plugins[key].hydrate(d, this);
    }
  }

  _total() {
    let base = this.accuracy - this.difficulty + this.#weapon.total(this.cover);
    // the only thing we actually use base for is the untyped bonuses
    let raw = base + this.#base.accuracy - this.#base.difficulty;
    let lockon = this.usingLockOn ? 1 : 0;
    let prone = this.prone ? 1 : 0;

    return raw + lockon + prone;
  }
}

export interface AccDiffHudDataParams {
  title: string;
  weapon: AccDiffHudWeaponParams;
  base: AccDiffHudBaseParams;
  targets: AccDiffHudTargetParams[];
  runtimeData?: string; // LancerActor or LancerItem uuid
}

export class AccDiffHudData {
  title: string;
  weapon: AccDiffHudWeapon;
  base: AccDiffHudBase;
  targets: AccDiffHudTarget[];
  lancerItem?: LancerItem; // not persisted, needs to be hydrated
  lancerActor?: LancerActor; // not persisted, needs to be hydrated

  constructor(obj: AccDiffHudDataParams) {
    this.title = $state(obj.title);
    this.weapon = $state(new AccDiffHudWeapon(obj.weapon));
    this.base = $state(new AccDiffHudBase(obj.base));
    this.targets = $state(obj.targets.map(t => new AccDiffHudTarget(t)));
    this.hydrate(obj.runtimeData ? fromUuidSync(obj.runtimeData) : null);
  }

  hydrate(runtimeData?: LancerItem | LancerActor | unknown) {
    if (runtimeData instanceof LancerItem) {
      this.lancerItem = runtimeData;
      this.lancerActor = runtimeData.actor ?? undefined;
    } else if (runtimeData instanceof LancerActor) {
      this.lancerActor = runtimeData ?? undefined;
    }

    this.weapon.hydrate(this);
    this.base.hydrate(this);
    for (let target of this.targets) {
      target.hydrate(this);
    }
  }

  replaceTargets(newTargets: string[]): AccDiffHudData {
    const oldTargets: { [key: string]: AccDiffHudTarget } = {};
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
        this.targets.push(AccDiffHudTarget.fromParams(token));
      } else {
        // Existing target, update state
        existingTarget.prone = token.actor?.system.statuses.prone || false;
        existingTarget.stunned = token.actor?.system.statuses.stunned || false;
        existingTarget.lockOnAvailable = token.actor?.system.statuses.lockon || false;
      }
    }

    for (let target of this.targets) {
      target.hydrate(this);
    }
    return this;
  }

  get raw(): AccDiffHudDataParams {
    return {
      title: this.title,
      weapon: this.weapon.raw,
      base: this.base.raw,
      targets: this.targets.map(t => t.raw),
      runtimeData: this.lancerItem?.uuid || this.lancerActor?.uuid,
    };
  }

  // Decode from a serialized object, optionally populating remaining data from an item
  static fromObject(obj: AccDiffHudDataParams, runtimeData?: LancerItem | LancerActor): AccDiffHudData {
    let ret = new this(obj);
    ret.hydrate(runtimeData);
    return ret;
  }

  static plugins: AccDiffHudPlugin<AccDiffHudPluginData>[] = [];
  static targetedPlugins: AccDiffHudPlugin<AccDiffHudPluginData>[] = [];
  static registerPlugin<D extends AccDiffHudPluginData, P extends AccDiffHudPlugin<D>>(plugin: P) {
    if (plugin.perRoll) {
      AccDiffHudWeapon.plugins[plugin.slug] = plugin;
    }
    if (plugin.perUnknownTarget) {
      AccDiffHudBase.plugins[plugin.slug] = plugin;
    }
    if (plugin.perTarget) {
      AccDiffHudTarget.plugins[plugin.slug] = plugin;
      this.targetedPlugins.push(plugin);
    }
    this.plugins.push(plugin);
  }

  static fromParams(
    runtimeData?: LancerItem | LancerActor,
    tags?: Tag[],
    title?: string,
    targets?: Token.Implementation[],
    grit?: number,
    flat?: number,
    starting?: [number, number] | number
  ): AccDiffHudData {
    let weapon = {
      accurate: false,
      inaccurate: false,
      seeking: false,
      engaged: false,
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
      grit: grit || 0,
      flatBonus: flat || 0,
      cover: Cover.None,
      accuracy: starting[0],
      difficulty: starting[1],
      plugins: {} as { [k: string]: any },
    };

    let obj: AccDiffHudDataParams = {
      title: title ? title : "Accuracy and Difficulty",
      weapon,
      base,
      targets: (targets || []).map(t => {
        let cover = Cover.None;
        if (t.actor?.statuses.has("cover_hard")) {
          cover = Cover.Hard;
        } else if (t.actor?.statuses.has("cover_soft")) {
          cover = Cover.Soft;
        }
        let ret: AccDiffHudTargetParams = {
          targetUuid: t.document.uuid,
          grit: base.grit,
          flatBonus: base.flatBonus,
          accuracy: 0,
          difficulty: 0,
          cover,
          consumeLockOn: true,
          prone: t.actor?.system.statuses.prone || false,
          stunned: t.actor?.system.statuses.stunned || false,
          plugins: {} as { [k: string]: any },
        };
        for (let plugin of this.targetedPlugins) {
          ret.plugins[plugin.slug] = plugin.perTarget!(t);
        }
        return ret;
      }),
    };

    for (let plugin of this.plugins) {
      if (plugin.perRoll) {
        obj.weapon.plugins[plugin.slug] = plugin.perRoll(runtimeData);
      }
      if (plugin.perUnknownTarget) {
        obj.base.plugins[plugin.slug] = plugin.perUnknownTarget();
      }
    }

    // for now this isn't using AccDiffTarget.fromParams, which means the code is duplicated
    // that's a relatively contained bit of tech debt, but let's handle it next time this is touched
    return AccDiffHudData.fromObject(obj, runtimeData);
  }
}

// side effects for importing, yes, yes, I know
AccDiffHudData.registerPlugin(Invisibility);
AccDiffHudData.registerPlugin(Spotter);
