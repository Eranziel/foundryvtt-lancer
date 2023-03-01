import { LANCER, replaceDefaultResource, TypeIcon } from "../config";
import { prepareOverheatMacro, prepareStructureMacro } from "../macros";
import { DamageType, EntryType } from "../enums";
import { fix_modify_token_attribute, LancerTokenDocument } from "../token";
import { AppliedDamage } from "./damage-calc";
import type { SystemData, SystemTemplates } from "../system-template";
import type { SystemDataType } from "../system-template";
import type { SourceDataType } from "../source-template";
import * as defaults from "../util/unpacking/defaults";
import { getAutomationOptions } from "../settings";
import { pilotInnateEffect } from "../effects/converter";
import type { LancerFRAME, LancerItem, LancerNPC_CLASS } from "../item/lancer-item";
import { LancerActiveEffect } from "../effects/lancer-active-effect";
import { ChangeWatchHelper } from "../util/misc";
import { frameToPath } from "./retrograde-map";
import { EffectHelper } from "../effects/effector";
import { LoadoutHelper } from "./loadout-util";
import { StrussHelper } from "./struss-util";
const lp = LANCER.log_prefix;

const DEFAULT_OVERCHARGE_SEQUENCE = ["+1", "+1d3", "+1d6", "+1d6+4"];

interface LancerActorDataSource<T extends EntryType> {
  type: T;
  data: SourceDataType<T>;
}
interface LancerActorDataProperties<T extends LancerActorType> {
  type: T;
  data: SystemDataType<T>;
}

type LancerActorSource =
  | LancerActorDataSource<EntryType.PILOT>
  | LancerActorDataSource<EntryType.MECH>
  | LancerActorDataSource<EntryType.NPC>
  | LancerActorDataSource<EntryType.DEPLOYABLE>;

type LancerActorProperties =
  | LancerActorDataProperties<EntryType.PILOT>
  | LancerActorDataProperties<EntryType.MECH>
  | LancerActorDataProperties<EntryType.NPC>
  | LancerActorDataProperties<EntryType.DEPLOYABLE>;

declare global {
  interface SourceConfig {
    Actor: LancerActorSource;
  }
  interface DataConfig {
    Actor: LancerActorProperties;
  }
  interface DocumentClassConfig {
    Actor: typeof LancerActor;
  }
}

// Track deletions here to avoid double-tapping delete of active effects.
const deleteIdCache = new Set<string>();
const deleteIdCacheCleanup = foundry.utils.debounce(() => deleteIdCache.clear(), 20_000); // If 20 seconds pass without us modifying delete id cache, wipe it

/**
 * Extend the Actor class for Lancer Actors.
 */
export class LancerActor extends Actor {
  // Kept for comparing previous to next values / doing deltas
  _passdownEffectTracker = new ChangeWatchHelper(); // Holds effects that are/will be passed down to descendants. Invalidation means we must pass down effects again

  // Helps us manage our ephemeral effects, as well as providing miscellaneous utility functions for effect management
  effectHelper = new EffectHelper(this);

  // Helps us manage our loadout, as well as providing miscellaneous utility functions for item management
  loadoutHelper = new LoadoutHelper(this);

  // Helps us handle structuring/overheating, as well as providing miscellaneous utility functions for struct/stress
  strussHelper = new StrussHelper(this);

  async damage_calc(damage: AppliedDamage, ap = false, paracausal = false): Promise<number> {
    const armored_damage_types = ["Kinetic", "Energy", "Explosive", "Variable"] as const;

    const ap_damage_types = [DamageType.Burn, DamageType.Heat] as const;

    let changes = {} as Record<string, number>;

    // Entities without Heat Caps take Energy Damage instead
    if (this.is_pilot()) {
      damage.Energy += damage.Heat;
      damage.Heat = 0;
    }

    // Step 1: Exposed doubles non-burn, non-heat damage
    if (this.effectHelper.findEffect("exposed")) {
      armored_damage_types.forEach(d => (damage[d] *= 2));
    }

    /**
     * Step 2: Reduce damage due to armor.
     * Step 3: Reduce damage due to resistance.
     * Armor reduction may favor attacker or defender depending on automation.
     * Default is "favors defender".
     */
    if (!paracausal && !this.effectHelper.findEffect("shredded")) {
      const defense_favor = true; // getAutomationOptions().defenderArmor
      // @ts-expect-error System's broken
      const resist_armor_damage = armored_damage_types.filter(t => this.system.resistances[t.toLowerCase()]);
      // @ts-expect-error System's broken
      const normal_armor_damage = armored_damage_types.filter(t => !this.system.resistances[t.toLowerCase()]);
      // @ts-expect-error System's broken
      const resist_ap_damage = ap_damage_types.filter(t => this.system.resistances[t.toLowerCase()]);
      // @ts-expect-error System's broken
      let armor = ap ? 0 : this.system.armor;
      let leftover_armor: number; // Temp 'storage' variable for tracking used armor

      // Defender-favored: Deduct Armor from non-resisted damages first
      if (defense_favor) {
        for (const t of normal_armor_damage) {
          leftover_armor = Math.max(armor - damage[t], 0);
          damage[t] = Math.max(damage[t] - armor, 0);
          armor = leftover_armor;
        }
      }

      // Deduct Armor from resisted damage
      for (const t of resist_armor_damage) {
        leftover_armor = Math.max(armor - damage[t], 0);
        damage[t] = Math.max(damage[t] - armor, 0) / 2;
        armor = leftover_armor;
      }

      // Attacker-favored: Deduct Armor from non-resisted damages first
      if (!defense_favor) {
        for (const t of normal_armor_damage) {
          leftover_armor = Math.max(armor - damage[t], 0);
          damage[t] = Math.max(damage[t] - armor);
          armor = leftover_armor;
        }
      }

      // Resist Burn & Heat, unaffected by Armor
      for (const t of resist_ap_damage) {
        damage[t] = damage[t] / 2;
      }
    }

    // Only set heat on items that have it
    if (this.hasHeatcap()) {
      changes["system.heat"] = this.system.heat.value + damage.Heat;
    }

    const armor_damage = Math.ceil(damage.Kinetic + damage.Energy + damage.Explosive + damage.Variable);
    let total_damage = armor_damage + damage.Burn;

    // Reduce Overshield first
    // @ts-expect-error System's broken
    if (this.system.overshield.value) {
      // @ts-expect-error System's broken
      const leftover_overshield = Math.max(this.system.overshield.value - total_damage, 0);
      // @ts-expect-error System's broken
      total_damage = Math.max(total_damage - this.system.overshield.value, 0);
      changes["system.overshield"] = leftover_overshield;
    }

    // Finally reduce HP by remaining damage
    if (total_damage) {
      // @ts-expect-error System's broken
      changes["system.hp"] = this.system.hp.value - total_damage;
    }

    // Add to Burn stat
    if (damage.Burn) {
      // @ts-expect-error System's broken
      changes["system.burn"] = this.system.burn + damage.Burn;
    }

    await this.update(changes);

    return total_damage;
  }

  /* -------------------------------------------- */

  /** @override
   * We require a customized active effect application workflow
   */
  prepareBaseData() {
    // 1. First, finalize our system tasks. Items should be (minimally) prepared by now, so we can resolve embedded items
    // @ts-expect-error
    this.system.finalize_tasks();

    // 2. Initialize our universal derived stat fields
    // @ts-expect-error
    let sys: SystemTemplates.actor_universal = this.system;
    sys.edef = 0;
    sys.evasion = 0;
    sys.speed = 0;
    sys.armor = 0;
    sys.size = 0;
    sys.save = 0;
    sys.sensor_range = 0;
    sys.tech_attack = 0;
    sys.statuses = {
      dangerzone: false,
      downandout: false,
      engaged: false,
      exposed: false,
      invisible: false,
      prone: false,
      shutdown: false,
      immobilized: false,
      impaired: false,
      jammed: false,
      lockon: false,
      shredded: false,
      slowed: false,
      stunned: false,
      hidden: false,
      invisibe: false,
    };
    sys.resistances = {
      burn: false,
      energy: false,
      explosive: false,
      heat: false,
      kinetic: false,
      variable: false,
    };
    /*
    sys.bonuses = {
      flat: defaults.ROLL_BONUS_TARGETS(),
      accuracy: defaults.ROLL_BONUS_TARGETS(),
    };
    */

    // 3. Query effects to set status flags
    for (let eff of this.effects) {
      let status_id = (eff.getFlag("core", "statusId") ?? null) as null | keyof typeof sys.statuses;
      if (status_id && sys.statuses[status_id] === false) {
        sys.statuses[status_id] = true;
      }
    }

    // 4. Establish type specific attributes / perform type specific prep steps
    // HASE is pretty generic. All but pilot need defaults - pilot gets from source
    if (this.is_mech() || this.is_deployable() || this.is_npc()) {
      this.system.hull = 0;
      this.system.agi = 0;
      this.system.sys = 0;
      this.system.eng = 0;
    }

    if (this.is_pilot()) {
      this.system.grit = Math.ceil(this.system.level / 2);
      this.system.hp.max = 6 + this.system.grit;
    } else if (this.is_mech()) {
      // Aggregate sp/ai
      let equipped_sp = 0;
      let equipped_ai = 0;
      for (let system of this.system.loadout.systems) {
        if (system?.status == "resolved") {
          equipped_sp += system.value.system.sp;
          equipped_ai += system.value.system.tags.some(t => t.is_ai) ? 1 : 0;
        }
      }
      for (let mount of this.system.loadout.weapon_mounts) {
        for (let slot of mount.slots) {
          if (slot.weapon?.status == "resolved") {
            equipped_sp += slot.weapon.value.system.sp;
          }
          if (slot.mod?.status == "resolved") {
            equipped_ai += slot.mod.value.system.tags.some(t => t.is_ai) ? 1 : 0;
          }
        }
      }

      // Initialize loadout statistics. Maxs will be fixed by active effects
      this.system.loadout.sp = { max: 0, min: 0, value: equipped_sp };
      this.system.loadout.ai_cap = { max: 1, min: 0, value: equipped_ai };
      this.system.loadout.limited_bonus = 0;

      // Other misc
      this.system.overcharge_sequence = DEFAULT_OVERCHARGE_SEQUENCE;
      this.system.psd = null;
      this.system.grit = 0;
      this.system.stress_repair_cost = 2;
      this.system.structure_repair_cost = 2;
    } else if (this.is_npc()) {
      this.system.class = this.items.find(i => i.is_npc_class()) as unknown as LancerNPC_CLASS;
    } else if (this.is_deployable()) {
      sys.armor = this.system.stats.armor;
      sys.edef = this.system.stats.edef;
      sys.evasion = this.system.stats.evasion;
      this.system.heat.max = this.system.stats.heatcap;
      sys.hp.max = this.system.stats.hp;
      sys.save = this.system.stats.save;
      sys.size = this.system.stats.size;
      sys.speed = this.system.stats.speed;
    }
  }

  /** @override
   * We need to, in order:
   *  - Mark things as equipped
   *  - Finalize derived data on weaponry based on fully prepared actor statistics
   */
  prepareDerivedData() {
    // Track equipping if pilot or mech
    if (this.is_pilot()) {
      // Mark things equipped
      let ld = this.system.loadout;
      for (let armor of ld.armor) {
        if (armor?.status == "resolved") {
          armor.value.system.equipped = true;
        }
      }
      for (let weapon of ld.weapons) {
        if (weapon?.status == "resolved") {
          weapon.value.system.equipped = true;
        }
      }
      for (let gear of ld.gear) {
        if (gear?.status == "resolved") {
          gear.value.system.equipped = true;
        }
      }
    } else if (this.is_mech()) {
      // Mark things equipped
      let ld = this.system.loadout;
      if (ld.frame?.status == "resolved") {
        ld.frame.value.system.equipped = true;
      }
      for (let system of ld.systems) {
        if (system?.status == "resolved") {
          system.value.system.equipped = true;
        }
      }
      for (let mount of this.system.loadout.weapon_mounts) {
        for (let slot of mount.slots) {
          if (slot.weapon?.status == "resolved") {
            slot.weapon.value.system.equipped = true;
          }
          if (slot.mod?.status == "resolved") {
            slot.mod.value.system.equipped = true;
            if (slot.weapon?.status == "resolved") {
              slot.weapon.value.system.mod = slot.mod.value;
            }
          }
        }
      }

      // Collect all bonuses
      // TODO - eventually we would rather have these handled via active effects
      this.system.all_bonuses = [];
      for (let item of this.loadoutHelper.listLoadout()) {
        this.system.all_bonuses.push(...(item.getBonuses() ?? []));
      }
    }

    // Ask items to prepare their final attributes using weapon_bonuses / equip information
    for (let item of this.items.contents) {
      // @ts-expect-error Eventually this will have per-item active effects. For now, it doesn't. cope i guess lol
      item.prepareFinalAttributes(this.system);
    }

    // Track shift in values. Use optional to handle compendium bulk-created items, which handle strangely
    this._passdownEffectTracker?.setValue(this.effectHelper.collectPassdownEffects());
  }

  /** @override
   * Want to preserve our arrays, so we use full_update_data to hydrate our update data
   */
  async update(data: any, options: any = {}) {
    // @ts-expect-error
    data = this.system.full_update_data(data);
    return super.update(data, options);
  }

  /** @override
   * This is mostly copy-pasted from Actor.modifyTokenAttribute to allow negative hps, which are useful for structure checks
   */
  async modifyTokenAttribute(attribute: string, value: any, isDelta = false, isBar = true) {
    // @ts-expect-error Should be fixed with v10 types
    const current = foundry.utils.getProperty(this.system, attribute);

    let updates;
    if (isBar) {
      if (isDelta) value = Number(current.value) + value;
      updates = { [`data.${attribute}.value`]: value };
    } else {
      if (isDelta) value = Number(current) + value;
      updates = { [`data.${attribute}`]: value };
    }

    // Call a hook to handle token resource bar updates
    fix_modify_token_attribute(updates);
    const allowed = Hooks.call("modifyTokenAttribute", { attribute, value, isDelta, isBar }, updates);
    return allowed ? this.update(updates) : this;
  }

  /** @override
   * This is overridden to pre-populate with slightly more sensible data,
   * such as nicer icons and default names, token dispositions, etc
   */
  protected async _preCreate(...[data, options, user]: Parameters<Actor["_preCreate"]>): Promise<void> {
    await super._preCreate(data, options, user);

    // @ts-expect-error Should be fixed with v10 types
    if (data.system?.lid) {
      if (!data.img || data.img == "icons/svg/mystery-man.svg") {
        // @ts-expect-error Should be fixed with v10 types
        this.updateSource({ img: TypeIcon(this.type) });
      }
      return;
    }

    let default_data: Record<string, any>;
    let disposition: ValueOf<(typeof CONST)["TOKEN_DISPOSITIONS"]> = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
    switch (this.type) {
      case EntryType.NPC:
        default_data = defaults.NPC();
        disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE;
        break;
      case EntryType.PILOT:
        default_data = defaults.PILOT();
        break;
      case EntryType.DEPLOYABLE:
        default_data = defaults.DEPLOYABLE();
        disposition = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
        break;
      case EntryType.MECH:
      default:
        // Idk, just in case
        default_data = defaults.MECH();
        default_data.actions = { full: true };
        break;
    }

    // Put in the basics
    // @ts-expect-error Should be fixed with v10 types
    this.updateSource({
      system: default_data,
      img: TypeIcon(this.type),
      // Link the token to the Actor for pilots and mechs, but not for NPCs or deployables
      prototypeToken: {
        actorLink: [EntryType.PILOT, EntryType.MECH].includes(this.type),
        disposition: disposition,
        displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
        name: this.name ?? default_data.name,
      },
    });
  }

  /** @override
   * Upon an actor being updated, we want to trigger automated cleanup, effect generation, etc
   */
  protected _onUpdate(...[changed, options, user]: Parameters<Actor["_onUpdate"]>) {
    super._onUpdate(changed, options, user);
    let i_did_this = game.userId == user;

    // If changing active mech, force a propagate, and force all mechs to render
    if ((changed as any).system?.active_mech !== undefined) {
      this.effectHelper.propagateEffects(i_did_this, true);
      // @ts-expect-error
      let owned_mechs = game.actors?.filter(a => a.is_mech() && a.system.pilot?.value == this);
      owned_mechs?.forEach(m => m.render());
    }

    // First try to regenerate our innate effect. If this is a no-op, it won't actually do any db operations
    if (this.is_pilot()) {
      // TODO - experiment with how the behaves with multiple users given that we currently only trigger this when the editing user
      // In theory we might need a "no-op" set ephemeral effects, that tells it what it oughj
      this.effectHelper.setEphemeralEffects(this.uuid, [pilotInnateEffect(this)], i_did_this, false);
    }

    // All other changes we want to only be handled by this user who actually triggered the effect
    // This is to prevent duplicate work + avoid permissions errors + they started it and should handle structuring/stressing
    if (!i_did_this) {
      return;
    }

    // Many of the operations below MIGHT cause DB operations (async operations!).
    // We can't really await them here, nor should we - they will re-trigger an onUpdate as necessary
    // Remove unresolved references.
    this.loadoutHelper.cleanupUnresolvedReferences();

    // Then re-asset all of our item effects
    for (let item of this.items.contents) {
      if (item.isEquipped()) {
        this.effectHelper.setEphemeralEffectsFromItem(item, i_did_this);
      } else {
        this.effectHelper.clearEphemeralEffects(item.uuid, i_did_this);
      }
    }
    // Check for overheating / structure
    if (
      getAutomationOptions().structure &&
      this.isOwner &&
      !(
        game.users?.players.reduce((a, u) => a || (u.active && this.testUserPermission(u, "OWNER")), false) &&
        game.user?.isGM
      ) &&
      (this.is_mech() || this.is_npc())
    ) {
      const data = changed as any; // DeepPartial<RegMechData | RegNpcData>;
      if ((data.system?.heat ?? 0) > this.system.heat.max && this.system.stress.value > 0) {
        prepareOverheatMacro(this);
      }
      if ((data.system?.hp ?? 1) <= 0 && this.system.structure.value > 0) {
        prepareStructureMacro(this);
      }
    }

    // If the Size of the ent has changed since the last update, set the
    // protype token size to the new size
    // @ts-expect-error System's broken
    if (this.prototypeToken?.width !== this.system.size) {
      // @ts-expect-error System's broken
      const size = Math.max(1, this.system.size);
      // @ts-expect-error
      this.prototypeToken?.update({
        width: size,
        height: size,
        flags: {
          "hex-size-support": {
            borderSize: size,
            altSnapping: true,
            evenSnap: !(size % 2),
          },
        },
      });
    }
  }

  /** @inheritdoc
   * Due to the complex effects equipment can have on an actors statistical values, it is necessary to be sure our
   * effects are kept in lockstep as items are created, updated, and deleted
   */
  _onCreateEmbeddedDocuments(
    embeddedName: "Item" | "ActiveEffect",
    documents: LancerItem[] | LancerActiveEffect[],
    result: any,
    options: any,
    user: string
  ) {
    super._onCreateEmbeddedDocuments(embeddedName, documents, result, options, user);
    let cause_updates = game.userId == user;

    // Create effects from new items
    if (embeddedName == "Item") {
      for (let item of documents as LancerItem[]) {
        if (item.isEquipped()) {
          this.effectHelper.setEphemeralEffectsFromItem(item, cause_updates); // Update the effects this item creates
        }
      }
    } else {
      this.effectHelper.propagateEffects(cause_updates); // Effects have changed - need to propagate
    }
  }

  /** @inheritdoc */
  _onUpdateEmbeddedDocuments(
    embeddedName: "Item" | "ActiveEffect",
    documents: LancerItem[] | LancerActiveEffect[],
    result: any,
    options: any,
    user: string
  ) {
    super._onUpdateEmbeddedDocuments(embeddedName, documents, result, options, user);
    let cause_updates = game.userId == user;

    // (Possibly) update effects from updated items, if the effects they provide have changed & item is equipped
    if (embeddedName == "Item") {
      for (let item of documents as LancerItem[]) {
        if (item.isEquipped() && item._generatedEffectTracker.isDirty) {
          this.effectHelper.setEphemeralEffectsFromItem(item, cause_updates); // Update the effects this item creates
        }
      }
    } else {
      this.effectHelper.propagateEffects(cause_updates); // Effects have changed - need to propagate
    }
  }

  /** @inheritdoc */
  _onDeleteEmbeddedDocuments(
    embeddedName: "Item" | "ActiveEffect",
    documents: LancerItem[] | LancerActiveEffect[],
    result: any,
    options: any,
    user: string
  ) {
    super._onDeleteEmbeddedDocuments(embeddedName, documents, result, options, user);
    // Mark them all as deleted for delete-deduplication purposes
    for (let doc of documents) {
      deleteIdCache.add(doc.uuid);
    }
    deleteIdCacheCleanup();

    let cause_updates = game.userId == user;

    // Clear effects from deleted items
    if (embeddedName == "Item") {
      for (let item of documents as LancerItem[]) {
        this.effectHelper.clearEphemeralEffects(item.uuid, cause_updates);
      }
      if (cause_updates) {
        this.loadoutHelper.cleanupUnresolvedReferences();
      }
    } else {
      this.effectHelper.propagateEffects(cause_updates); // Effects have changed
      // Warn if it appears that a user has tried to delete a managed effect
      if (!this.effectHelper._deletingEffect) {
        for (let doc of documents as LancerActiveEffect[]) {
          if (doc._typedFlags?.lancer?.ephemeral) {
            let msg =
              "Attempting to delete an effect sourced from an item or other actor. It might regenerate! Instead of deleting the effect, delete the source.";
            ui.notifications?.warn(msg);
          }
        }
      }
    }
  }

  /**
   * Delete an active effect(s) without worrying if its been deleted before.
   * There is still technically an _exceedingly_ narrow window in which we can get duplicate deletion of effects, but this mitigates it
   */
  async _safeDeleteEmbedded(
    collection: "Item" | "ActiveEffect",
    effects: ActiveEffect[] | Item[],
    options?: DocumentModificationContext
  ): Promise<any> {
    if (!effects.length) return;
    let toDelete = [];
    for (let e of effects) {
      let u = e.uuid ?? "";
      if (!deleteIdCache.has(u)) {
        deleteIdCache.add(u);
        toDelete.push(e.id!);
      }
    }
    deleteIdCacheCleanup();
    return this.deleteEmbeddedDocuments(collection, toDelete, options);
  }

  // Typeguards
  is_pilot(): this is LancerPILOT {
    return this.type === EntryType.PILOT;
  }
  is_mech(): this is LancerMECH {
    return this.type === EntryType.MECH;
  }
  is_npc(): this is LancerNPC {
    return this.type === EntryType.NPC;
  }
  is_deployable(): this is LancerDEPLOYABLE {
    return this.type === EntryType.DEPLOYABLE;
  }

  // Quick checkers
  hasHeatcap(): this is { system: SystemTemplates.heat } {
    return (this as any).system.heat !== undefined;
  }
  /**
   * Taking a new and old frame/class, swaps the actor and/or token images if
   * we detect that the image isn't custom. Will check each individually
   * @param oldFrame  Old Frame or NPC Class
   * @param newFrame  New Frame or NPC Class
   * @returns         The newFrame if any updates were performed
   */
  async swapFrameImage(newFrame: LancerFRAME | LancerNPC_CLASS): Promise<void> {
    if (!(this.is_mech() || this.is_deployable())) return;

    let new_frame_path = frameToPath(newFrame?.name);
    let default_img = this.is_mech()
      ? "systems/lancer/assets/icons/mech.svg"
      : "systems/lancer/assets/icons/npc_class.svg";

    // @ts-expect-error Should be fixed with v10 types
    let curr_token: string | null | undefined = this.prototypeToken?.texture?.src;
    let curr_actor: string | null | undefined = this.img;

    await this.update({
      img: replaceDefaultResource(curr_actor, new_frame_path, default_img),
      "prototypeToken.texture.src": replaceDefaultResource(curr_token, new_frame_path, default_img),
    });
  }

  // Checks that the provided document is not null, and is a lancer actor
  static async fromUuid(x: string | LancerActor, messagePrefix?: string): Promise<LancerActor> {
    if (x instanceof LancerActor) return x;
    x = (await fromUuid(x)) as LancerActor;
    if (!x) {
      let message = `${messagePrefix ? messagePrefix + " | " : ""}Actor ${x} not found.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    // @ts-ignore Infinite recursion for some reason
    if (x instanceof TokenDocument) x = x.actor!;
    if (!(x instanceof LancerActor)) {
      let message = `${messagePrefix ? messagePrefix + " | " : ""}Document ${x} not an actor.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    return x;
  }

  // Checks that the provided document is not null, and is a lancer actor
  static fromUuidSync(x: string | LancerActor, messagePrefix?: string): LancerActor {
    if (x instanceof LancerActor) return x;
    x = fromUuidSync(x) as LancerActor;
    if (!x) {
      let message = `${messagePrefix ? messagePrefix + " | " : ""}Actor ${x} not found.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    // @ts-ignore Infinite recursion for some reason
    if (x instanceof TokenDocument) x = x.actor!;
    if (!(x instanceof LancerActor)) {
      let message = `${messagePrefix ? messagePrefix + " | " : ""}Document ${x} not an actor.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    return x;
  }
}

// Typeguards
export type LancerPILOT = LancerActor & { system: SystemData.Pilot };
export type LancerMECH = LancerActor & { system: SystemData.Mech };
export type LancerNPC = LancerActor & { system: SystemData.Npc };
export type LancerDEPLOYABLE = LancerActor & { system: SystemData.Deployable };

export type LancerActorType = EntryType.MECH | EntryType.DEPLOYABLE | EntryType.NPC | EntryType.PILOT;
export const ACTOR_TYPES: LancerActorType[] = [EntryType.MECH, EntryType.DEPLOYABLE, EntryType.NPC, EntryType.PILOT];

export function is_actor_type(type: any): type is LancerActorType {
  return ACTOR_TYPES.includes(type as LancerActorType);
}
