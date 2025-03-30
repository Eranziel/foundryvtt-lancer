import { LANCER, replaceDefaultResource, TypeIcon } from "../config";
import { DamageType, EntryType } from "../enums";
import { AppliedDamage } from "./damage-calc";
import { SystemData, SystemDataType, SystemTemplates } from "../system-template";
import { SourceDataType } from "../source-template";
import {
  LancerBOND,
  LancerFRAME,
  LancerItem,
  LancerNPC_CLASS,
  LancerNPC_FEATURE,
  LancerNPC_TEMPLATE,
} from "../item/lancer-item";
import { LancerActiveEffect } from "../effects/lancer-active-effect";
import { frameToPath } from "./retrograde-map";
import { EffectHelper } from "../effects/effector";
import { insinuate } from "../util/doc";
import { fromLid } from "../helpers/from-lid";
import { LoadoutHelper } from "./loadout-util";
import { StrussHelper } from "./struss-util";
import { StructureFlow } from "../flows/structure";
import { OverheatFlow } from "../flows/overheat";
import { BasicAttackFlow } from "../flows/attack";
import { npcInnateEffects, pilotInnateEffects } from "../effects/converter";
import { TechAttackFlow } from "../flows/tech";
import { FullRepairFlow } from "../flows/full-repair";
import { StatRollFlow } from "../flows/stat";
import { OverchargeFlow } from "../flows/overcharge";
import { NPCRechargeFlow } from "../flows/npc";
import * as lancer_data from "@massif/lancer-data";
import { StabilizeFlow } from "../flows/stabilize";
import { rollEvalSync, tokenScrollText, TokenScrollTextOptions } from "../util/misc";
import { BurnFlow } from "../flows/burn";
import { createChatMessageStep } from "../flows/_render";
import { DamageRollFlow } from "../flows/damage";
import { type DatabaseDeleteOperation } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/_types.mjs";

const lp = LANCER.log_prefix;

const DEFAULT_OVERCHARGE_SEQUENCE = "+1,+1d3,+1d6,+1d6+4" as const;

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
  // Helps us manage our ephemeral effects, as well as providing miscellaneous utility functions for effect management
  effectHelper!: EffectHelper; // = new EffectHelper(this);

  // Helps us manage our loadout, as well as providing miscellaneous utility functions for item management
  loadoutHelper!: LoadoutHelper; // = new LoadoutHelper(this);

  // Helps us handle structuring/overheating, as well as providing miscellaneous utility functions for struct/stress
  strussHelper!: StrussHelper; // = new StrussHelper(this);

  // @ts-expect-error - Foundry initializes this.
  system: SystemData.Pilot | SystemData.Mech | SystemData.Npc | SystemData.Deployable;

  // Promises for NPC class/template swap. That work is initiated by a sync method,
  // so we need a way to track when the work is finished.
  npcClassSwapPromises: Promise<any>[] = [];

  // These cannot be instantiated the normal way (e.x. via constructor)
  _configure(options: unknown) {
    // @ts-expect-error
    super._configure(options);
    this.effectHelper = new EffectHelper(this);
    this.loadoutHelper = new LoadoutHelper(this);
    this.strussHelper = new StrussHelper(this);
  }

  async damageCalc(
    damage: AppliedDamage,
    { multiple = 1, ap = false, paracausal = false, addBurn = true }
  ): Promise<number> {
    const armoredDamageTypes = [
      DamageType.Kinetic,
      DamageType.Energy,
      DamageType.Explosive,
      DamageType.Variable,
    ] as const;
    const apDamageTypes = [DamageType.Burn, DamageType.Heat] as const;
    // Promises for async tasks that happen as a result of this damage calculation
    const taskPromises: Promise<any>[] = [];
    const tokenId = this.token?.id;

    let changes = {} as Record<string, number>;

    // Damage multipliers - exposed and whichever multiple chosen by the user
    const exposed = this.system.statuses.exposed;
    // Ensure the multiple is valid, default to 1x
    if (![0.5, 1, 2].includes(multiple)) multiple = 1;
    const resistAll = multiple === 0.5;

    // Entities without Heat Caps take Energy Damage instead
    if (!this.hasHeatcap()) {
      damage.Energy += damage.Heat;
      damage.Heat = 0;
    }

    // Step 0: 2x multiplier doubles everything
    if (multiple === 2) {
      for (const d of Object.values(DamageType)) {
        damage[d] *= 2;
      }
    }

    // Step 1: Exposed doubles non-burn, non-heat damage
    if (exposed) {
      armoredDamageTypes.forEach(d => Math.ceil((damage[d] *= 2)));
    }

    /**
     * Step 2: Reduce damage due to armor.
     * Step 3: Reduce damage due to resistance.
     * Armor reduction may favor attacker or defender depending on automation.
     * Default is "favors defender".
     */
    if (!paracausal && !this.system.statuses.shredded) {
      const defenseFavor = true; // getAutomationOptions().defenderArmor
      // TODO: figure out how to fix this typing
      // @ts-expect-error
      const resistArmorDamage = armoredDamageTypes.filter(t => resistAll || this.system.resistances[t.toLowerCase()]);
      const normalArmorDamage = armoredDamageTypes.filter(t => !resistArmorDamage.includes(t));
      // @ts-expect-error
      const resistApDamage = apDamageTypes.filter(t => resistAll || this.system.resistances[t.toLowerCase()]);
      let armor = ap ? 0 : this.system.armor;
      let leftoverArmor: number; // Temp 'storage' variable for tracking used armor

      // Defender-favored: Deduct Armor from non-resisted damages first
      if (defenseFavor) {
        for (const t of normalArmorDamage) {
          leftoverArmor = Math.max(armor - damage[t], 0);
          damage[t] = Math.max(damage[t] - armor, 0);
          armor = leftoverArmor;
        }
      }

      // Deduct Armor from resisted damage
      for (const t of resistArmorDamage) {
        leftoverArmor = Math.max(armor - damage[t], 0);
        // Always round up to nearest integer
        damage[t] = Math.ceil(Math.max(damage[t] - armor, 0) / 2);
        armor = leftoverArmor;
      }

      // Attacker-favored: Deduct Armor from non-resisted damages first
      if (!defenseFavor) {
        for (const t of normalArmorDamage) {
          leftoverArmor = Math.max(armor - damage[t], 0);
          damage[t] = Math.max(damage[t] - armor);
          armor = leftoverArmor;
        }
      }

      // Resist Burn & Heat, unaffected by Armor
      for (const t of resistApDamage) {
        // Always round up to nearest integer
        damage[t] = Math.ceil(damage[t] / 2);
      }
    }

    // Only set heat on items that have it
    if (this.hasHeatcap()) {
      changes["system.heat.value"] = this.system.heat.value + damage.Heat;
    }

    const armorDamage = Math.ceil(damage.Kinetic + damage.Energy + damage.Explosive + damage.Variable);
    let totalDamage = armorDamage + damage.Burn;
    let overshieldUsed = 0;
    // Reduce Overshield first
    if (this.system.overshield.value) {
      overshieldUsed = Math.min(this.system.overshield.value, totalDamage);
      const leftoverOvershield = Math.max(this.system.overshield.value - totalDamage, 0);
      totalDamage = Math.max(totalDamage - this.system.overshield.value, 0);
      changes["system.overshield.value"] = leftoverOvershield;
    }

    // Finally reduce HP by remaining damage
    if (totalDamage) {
      changes["system.hp.value"] = this.system.hp.value - totalDamage;
    }

    // Add to Burn stat
    if (damage.Burn && addBurn) {
      changes["system.burn"] = this.system.burn + damage.Burn;
    }

    taskPromises.push(this.update(changes));

    // Create a chat message which reports the applied damage
    const damageStrings = [];
    let totalTypes = 0;
    if (damage.Kinetic) {
      damageStrings.push(`${damage.Kinetic}<i class="cci cci-kinetic damage--kinetic i--s"></i>`);
      totalTypes += 1;
    }
    if (damage.Energy) {
      damageStrings.push(`${damage.Energy}<i class="cci cci-energy damage--energy i--s"></i>`);
      totalTypes += 1;
    }
    if (damage.Explosive) {
      damageStrings.push(`${damage.Explosive}<i class="cci cci-explosive damage--explosive i--s"></i>`);
      totalTypes += 1;
    }
    if (damage.Variable) {
      damageStrings.push(`${damage.Variable}<i class="cci cci-variable damage--variable i--s"></i>`);
      totalTypes += 1;
    }
    if (damage.Burn) {
      damageStrings.push(`${damage.Burn}<i class="cci cci-burn damage--burn i--s"></i>`);
      totalTypes += 1;
    }
    if (damage.Heat) {
      damageStrings.push(`${damage.Heat}<i class="cci cci-heat damage--heat i--s"></i>`);
      totalTypes += 1;
    }
    const allDamageString = damageStrings.length ? damageStrings.join(", ") : "0";
    const totalDamageString = totalTypes > 1 ? ` (${overshieldUsed + totalDamage} total) ` : "";
    const chatContent = `<div class="flexrow">
      <span>${this.token ? this.token.name : this.name} took ${allDamageString} ${totalDamageString}damage!</span>
      <a
        class="lancer-button lancer-damage-undo"
        style="display: flex; flex-grow: 0; justify-content: center; align-items: center;"
        data-tooltip="Undo this damage"
        data-uuid="${this.uuid}"
        data-overshield-delta="${overshieldUsed}"
        data-hp-delta="${totalDamage}"
        data-burn-delta="${damage.Burn}"
        data-heat-delta="${damage.Heat}"
        data-add-burn="${addBurn}"
      >
        <i class="fas fa-undo"></i>
      </a>
    </div>`;
    taskPromises.push(createChatMessageStep(this, chatContent));
    await Promise.all(taskPromises);
    return totalDamage;
  }

  /* -------------------------------------------- */

  /** @override
   * We require a customized active effect application workflow
   */
  prepareBaseData() {
    // Some modules create actors with type "base", or potentially others we don't care about
    //@ts-expect-error V12 typing in progress
    if (!ACTOR_TYPES.includes(this.type)) {
      console.log("Actor is not a LancerActor:", this);
      return super.prepareBaseData();
    }
    // TODO: Move these to the datamodels themselves
    // 1. First, finalize our system tasks. Items should be (minimally) prepared by now, so we can resolve embedded items
    // // @ts-expect-error
    // this.system.finalize_tasks();

    // 2. Initialize our universal derived stat fields
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
    };
    sys.resistances = {
      burn: false,
      energy: false,
      explosive: false,
      heat: false,
      kinetic: false,
      variable: false,
    };
    sys.bonuses = {
      flat: {},
      weapon_bonuses: [],
    };
    /*
    sys.bonuses = {
      flat: defaults.ROLL_BONUS_TARGETS(),
      accuracy: defaults.ROLL_BONUS_TARGETS(),
    };
    */

    // 3. Establish type specific attributes / perform type specific prep steps
    // HASE is pretty generic. All but pilot need defaults - pilot gets from source
    if (this.is_mech() || this.is_deployable() || this.is_npc()) {
      this.system.hull = 0;
      this.system.agi = 0;
      this.system.sys = 0;
      this.system.eng = 0;
    }

    if (this.is_pilot()) {
      this.system.grit = Math.ceil(this.system.level / 2);
      this.system.hp.max = lancer_data.rules.base_pilot_hp + this.system.grit;
      this.system.bond = (this.items.find(i => i.is_bond()) ?? null) as unknown as LancerBOND | null;
      this.system.size = 0.5;
      this.system.sensor_range = 5;
      this.system.save = this.system.grit + 10;
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
            equipped_sp += slot.mod.value.system.sp;
            equipped_ai += slot.mod.value.system.tags.some(t => t.is_ai) ? 1 : 0;
            if (slot.weapon?.value) {
              slot.weapon.value.system.mod = slot.mod.value;
            }
          }
        }
      }

      // Initialize loadout statistics. Maxs will be fixed by active effects
      this.system.loadout.sp = { max: 0, min: 0, value: equipped_sp };
      this.system.loadout.ai_cap = { max: 1, min: 0, value: equipped_ai };
      this.system.loadout.limited_bonus = 0;

      // Other misc
      this.system.overcharge_sequence = DEFAULT_OVERCHARGE_SEQUENCE;
      this.system.level = 0;
      this.system.grit = 0;
      this.system.stress_repair_cost = 2;
      this.system.structure_repair_cost = 2;
    } else if (this.is_npc()) {
      this.system.class = this.items.find(i => i.is_npc_class()) as unknown as LancerNPC_CLASS;
      this.system.templates = this.items.filter(i => i.is_npc_template()) as unknown as LancerNPC_TEMPLATE[];
    } else if (this.is_deployable()) {
      sys.armor = this.system.stats.armor;
      sys.edef = this.system.stats.edef;
      sys.evasion = this.system.stats.evasion;
      this.system.heat.max = this.system.stats.heatcap;
      sys.save = this.system.stats.save;
      sys.size = this.system.stats.size;
      sys.speed = this.system.stats.speed;
      this.system.level = 0;
      this.system.grit = 0;
      this.system.hp_bonus = 0;
      // Don't do max hp just yet!
    }

    // Marked our equipped items as such
    this._markEquipped();
  }

  /** @override
   * We need to, in order:
   *  - Mark things as equipped
   *  - Finalize derived data on weaponry based on fully prepared actor statistics
   */
  prepareDerivedData() {
    // Ask items to prepare their final attributes using weapon_bonuses / equip information
    for (let item of this.items.contents) {
      item.prepareFinalAttributes();
    }

    // Track shift in values. Use optional to handle compendium bulk-created items, which handle strangely
    this.effectHelper._passdownEffectTracker?.setValue(this.effectHelper.collectPassdownEffects());
    this._markStatuses();

    // Special case for the emperor - subtract grit
    if (this.is_mech() && this.items.find(i => i.system.lid === "mf_emperor")) {
      this.system.hp.max -= this.system.grit;
    }

    // Deployables: calculate max hp
    if (this.is_deployable()) {
      this.system.hp.max = rollEvalSync(`${this.system.stats.hp} + ${this.system.hp_bonus}`, this.getRollData()) || 5;
    }
  }

  /** Check which statuses this actor has active and set system.status accordingly */
  _markStatuses() {
    if (!this.statuses) return;
    for (const status of this.statuses.keys()) {
      // @ts-expect-error
      this.system.statuses[status] = true;
      // Mark resistances based on statuses
      switch (status) {
        case "resistance_burn":
          this.system.resistances.burn = true;
          break;
        case "resistance_energy":
          this.system.resistances.energy = true;
          break;
        case "resistance_explosive":
          this.system.resistances.explosive = true;
          break;
        case "resistance_heat":
          this.system.resistances.heat = true;
          break;
        case "resistance_kinetic":
          this.system.resistances.kinetic = true;
          break;
      }
    }
  }

  /** Mark our equipped items as equipped */
  _markEquipped() {
    // Mark things as default equipped or unequipped as appropriate
    for (let i of this.items) {
      i._resetEquipped();
    }

    // Track equipping if pilot or mech
    if (this.is_pilot()) {
      // Mark things equipped
      let ld = this.system.loadout;
      for (let armor of ld.armor) {
        if (armor?.value) armor.value.system.equipped = true;
      }
      for (let weapon of ld.weapons) {
        if (weapon?.value) weapon.value.system.equipped = true;
      }
      for (let gear of ld.gear) {
        if (gear?.value) gear.value.system.equipped = true;
      }
    } else if (this.is_mech()) {
      // Mark things equipped
      let ld = this.system.loadout;
      if (ld.frame?.value) ld.frame.value.system.equipped = true;
      for (let system of ld.systems) {
        if (system?.value) system.value.system.equipped = true;
      }
      for (let mount of this.system.loadout.weapon_mounts) {
        for (let slot of mount.slots) {
          if (slot.weapon?.value) slot.weapon.value.system.equipped = true;
          if (slot.mod?.value) slot.mod.value.system.equipped = true;
        }
      }
    }
  }

  /**
   * Want to yield from all items ephemeral effects
   * @override
   */
  *allApplicableEffects() {
    yield* super.allApplicableEffects();

    // Yield all inherited ephemeral effects
    yield* this.effectHelper.inheritedEffects();

    // Yield all items ephemeral effects
    for (let item of this.items.contents) {
      yield* item._generateEphemeralEffects();
    }

    // Yield this actors innate effects
    if (this.is_pilot()) {
      yield* pilotInnateEffects(this);
    } else if (this.is_npc()) {
      yield* npcInnateEffects(this);
    }
  }

  /**
   * Want to preserve our arrays, so we use full_update_data to hydrate our update data
   * @override
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
    const current = foundry.utils.getProperty(this.system, attribute);

    let updates;
    if (isBar) {
      if (isDelta) value = Number(current.value) + value;
      updates = { [`system.${attribute}.value`]: value };
    } else {
      if (isDelta) value = Number(current) + value;
      updates = { [`system.${attribute}`]: value };
    }

    // Call a hook to handle token resource bar updates
    const allowed = Hooks.call("modifyTokenAttribute", { attribute, value, isDelta, isBar }, updates);
    return allowed ? this.update(updates) : this;
  }

  /** @override
   * This is overridden to pre-populate with slightly more sensible data,
   * such as nicer icons and default names, token dispositions, etc
   */
  protected async _preCreate(...[data, options, user]: Parameters<Actor["_preCreate"]>): Promise<boolean | void> {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    let img = data?.img || TypeIcon(this.type);

    let disposition: typeof CONST["TOKEN_DISPOSITIONS"][keyof typeof CONST["TOKEN_DISPOSITIONS"]] =
      {
        [EntryType.NPC]: CONST.TOKEN_DISPOSITIONS.HOSTILE,
        [EntryType.PILOT]: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        [EntryType.DEPLOYABLE]: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
        [EntryType.MECH]: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        ["base"]: undefined,
      }[this.type] ?? CONST.TOKEN_DISPOSITIONS.FRIENDLY;

    // Put in the basics
    this.updateSource({
      img,
      // Link the token to the Actor for pilots and mechs, but not for NPCs or deployables
      prototypeToken: {
        actorLink: [EntryType.PILOT, EntryType.MECH].includes(this.type as EntryType),
        disposition: disposition,
      },
    });
  }

  /** @override
   * When an update is queued, trigger scrolling text on attached tokens
   */
  protected async _preUpdate(...[data, options, user]: Parameters<Actor["_preUpdate"]>): Promise<boolean | void> {
    const allowed = await super._preUpdate(data, options, user);
    if (allowed === false) return false;
    this.statChangeScrollingText(data);
  }

  /** @override
   * Upon an actor being updated, we want to trigger automated cleanup, effect generation, etc
   */
  protected _onUpdate(...[changed, options, userId]: Parameters<Actor["_onUpdate"]>) {
    super._onUpdate(changed, options, userId);
    let cause_updates = game.userId == userId;

    // If changing active mech, all mechs need to render to recompute if they are the active mech
    let changing_active_mech = (changed as any).system?.active_mech !== undefined;
    if (changing_active_mech) {
      let owned_mechs: LancerActor[] = game.actors!.filter(
        (a: LancerActor) => a.is_mech() && a.system.pilot?.value == this
      );
      owned_mechs?.forEach(m => m.render());
    }

    // All other changes we want to only be handled by this user who actually triggered the effect
    // This is to prevent duplicate work + avoid permissions errors + they started it and should handle structuring/stressing
    if (!cause_updates) {
      return;
    }

    // Any update could change our innate effects which would then need to be passed down
    this.effectHelper.propagateEffects(changing_active_mech);

    // Assigning a pilot to a mech or a deployer to a deployable should trigger effect propagation in the new owner
    if ((this.is_mech() || this.is_deployable()) && (changed as any).system?.owner) {
      LancerActor.fromUuid((changed as any).system.owner).then((a: LancerActor) => {
        if (a) {
          a.effectHelper.propagateEffects(true);
        }
      });
    }

    // Many of the operations below MIGHT cause DB operations (async operations!).
    // We can't really await them here, nor should we - they will re-trigger an onUpdate as necessary
    // Remove unresolved references.
    this.loadoutHelper.cleanupUnresolvedReferences();
  }

  /**
   * Makes us own (or rather, creates an owned copy of) the provided item if we don't already.
   * The second return value indicates whether a new copy was made (true), or if we already owned it/it is an actor (false)
   * Note: this operation also fixes limited to be the full capability of our actor
   * @param document
   * @returns The created item, and whether it was created. If it already existed or the document was an actor, the second value is false.
   */
  async quickOwn(document: LancerItem): Promise<[LancerItem, boolean]> {
    if (document.parent != this) {
      let results = await insinuate([document], this);
      for (let newItem of results) {
        const updates: any = {};
        if (newItem.isLimited()) {
          updates["system.uses.value"] = newItem.system.uses.max;
        }
        if (newItem.isLoading()) {
          updates["system.loaded"] = true;
        }
        if (newItem.isRecharge()) {
          updates["system.charged"] = true;
        }
        if (Object.values(updates).length > 0) {
          await newItem.update(updates);
        }
      }
      return [results[0], true];
    } else {
      // It's already owned
      return [document, false];
    }
  }

  /** @inheritdoc
   * Due to the complex effects equipment can have on an actors statistical values, it is necessary to be sure our
   * effects are kept in lockstep as items are created, updated, and deleted
   */
  _onCreateDescendantDocuments(
    parent: ClientDocument,
    collection: "items" | "effects",
    documents: LancerItem[] | LancerActiveEffect[],
    changes: any[],
    options: any,
    userId: string
  ) {
    // When adding an NPC class, find the old class if one exists.
    let oldClass: LancerNPC_CLASS | null = null;
    // What janky types! If someone has ideas to clean this up, be my guest.
    let itemDocs: LancerItem[] = (documents as (LancerItem | LancerActiveEffect)[]).filter(
      d => d.documentName === "Item"
    ) as LancerItem[];
    if (this.is_npc() && itemDocs.some(d => d.is_npc_class())) {
      oldClass = this.items.find(
        item => item.is_npc_class() && !itemDocs.find(doc => item._id === doc._id)
      ) as LancerNPC_CLASS;
    }

    super._onCreateDescendantDocuments(parent, collection, documents, changes, options, userId);

    if (game.userId != userId) return;

    // If an NPC class or template was added, add and remove the relevant features.
    if (this.is_npc() && itemDocs.some(d => d.is_npc_class() || d.is_npc_template())) {
      itemDocs = itemDocs.filter(d => d.is_npc_class() || d.is_npc_template());
      let newClass = itemDocs.find(d => d.is_npc_class()) as LancerNPC_CLASS;
      if (newClass) this.npcClassSwapPromises.push(this._swapNpcClass(oldClass, newClass));

      let newTemplates = itemDocs.filter(d => d.is_npc_template()) as LancerNPC_TEMPLATE[];
      newTemplates.forEach(t => this.npcClassSwapPromises.push(this._swapNpcClass(null, t)));
    }

    // Ensure charged/loaded/limited uses are full
    for (let item of itemDocs) {
      if (item.isLimited()) {
        item.update({ "system.uses.value": item.system.uses.max });
      }
      if (item.isLoading()) {
        item.update({ "system.loaded": true });
      }
      if (item.isRecharge()) {
        item.update({ "system.charged": true });
      }
    }

    this.effectHelper.propagateEffects(false); // Items / Effects have changed - may need to propagate
  }

  /** @inheritdoc */
  _onUpdateDescendantDocuments(
    parent: ClientDocument,
    collection: "items" | "effects",
    documents: LancerItem[] | LancerActiveEffect[],
    changes: any[],
    options: any,
    userId: string
  ) {
    super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);
    if (game.userId == userId) {
      this.effectHelper.propagateEffects(false); // Effects have changed - may need to propagate
    }
  }

  /** @inheritdoc */
  _onDeleteDescendantDocuments(
    parent: ClientDocument,
    collection: "items" | "effects",
    documents: LancerItem[] | LancerActiveEffect[],
    changes: any,
    options: any,
    userId: string
  ) {
    super._onDeleteDescendantDocuments(parent, collection, documents, changes, options, userId);

    // Mark them all as deleted for delete-deduplication purposes
    for (let doc of documents) {
      deleteIdCache.add(doc.uuid);
    }
    deleteIdCacheCleanup();

    let cause_updates = game.userId == userId;

    // Clear effects from deleted items
    if (cause_updates) {
      this.loadoutHelper.cleanupUnresolvedReferences(); // Deleted items may have left unresolved references
      this.effectHelper.propagateEffects(false); // Effects have changed - may need to propagate
    }
  }

  /**
   * Delete a descendant document without worrying if its been deleted before.
   * There is still technically an _exceedingly_ narrow window in which we can get duplicate deletion of effects, but this mitigates it
   */
  async _safeDeleteDescendant(
    collection: "Item" | "ActiveEffect",
    effects: ActiveEffect[] | LancerItem[],
    options?: DatabaseDeleteOperation & {} & {}
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

  async removeClassFeatures(item: LancerItem) {
    if (!this.is_npc() || (!item.is_npc_class() && !item.is_npc_template())) return;
    const targetFeatures = [...item.system.base_features, ...item.system.optional_features];
    // @ts-ignore Intermittent types error
    let matches = this.itemTypes.npc_feature.filter(feat => targetFeatures.includes(feat.system.lid));
    await this._safeDeleteDescendant(
      "Item",
      matches.filter((x: LancerItem | undefined) => x)
    );
  }

  /**
   * Taking a new and old frame/class, swaps the actor and/or token images if
   * we detect that the image isn't custom. Will check each individually
   * @param newFrame  New Frame or NPC Class
   * @returns         The newFrame if any updates were performed
   */
  async swapFrameImage(newFrame: LancerFRAME | LancerNPC_CLASS): Promise<void> {
    if (!game.users.activeGM?.isSelf || !(this.is_mech() || this.is_npc())) return;

    let new_frame_path = frameToPath(newFrame?.name);
    let default_img = this.is_mech()
      ? "systems/lancer/assets/icons/mech.svg"
      : "systems/lancer/assets/icons/npc_class.svg";

    let curr_token: string | null | undefined = this.prototypeToken?.texture?.src;
    let curr_actor: string | null | undefined = this.img;

    await this.update({
      img: replaceDefaultResource(curr_actor, new_frame_path, default_img),
      "prototypeToken.texture.src": replaceDefaultResource(curr_token, new_frame_path, default_img),
    });
  }

  /**
   * Taking a new frame/class, set the prototype token size
   * @param newFrame - The new frame or class to pull the size from.
   */
  async updateTokenSize(newFrame: LancerFRAME | LancerNPC_CLASS): Promise<void> {
    let new_size: number | undefined;
    if (newFrame.is_frame() && this.is_mech()) {
      new_size = Math.max(1, newFrame.system.stats.size);
    } else if (newFrame.is_npc_class() && this.is_npc()) {
      const tier = this.system.tier || 1;
      new_size = Math.max(1, newFrame.system.base_stats[tier - 1].size);
    }
    if (!new_size) return;
    // @ts-expect-error
    await this.prototypeToken.update({ height: new_size, width: new_size });
  }

  // Given a list of npc features, return the corresponding entries on this npc
  findMatchingFeaturesInNpc(featureLids: string[]): LancerNPC_FEATURE[] {
    if (!this.is_npc()) return [];
    let result = [];
    for (let predicateLid of featureLids) {
      // @ts-ignore Intermittent types error
      for (let candidate_feature of this.itemTypes.npc_feature as LancerNPC_FEATURE[]) {
        if (candidate_feature.system.lid == predicateLid) {
          result.push(candidate_feature);
        }
      }
    }
    return result;
  }

  /**
   * Internal utility method, intended to be called by _onCreateDescendantDocuments.
   * Removes features associated with the old class and adds features associated with the new class.
   * @param oldClass The old class which is being removed
   * @param newClass The new class which is being added
   */
  async _swapNpcClass(oldClass: LancerNPC_CLASS | null, newClass: LancerNPC_CLASS | LancerNPC_TEMPLATE): Promise<void> {
    if (!game.users.activeGM?.isSelf || !this.is_npc() || (!newClass.is_npc_class() && !newClass.is_npc_template()))
      return;
    // Flag to know if we need to reset stats
    let needsRefresh = false;

    // If this NPC has an existing class, remove it and all its features
    if (oldClass) {
      // Find the features from the old class
      let classFeatures = this.findMatchingFeaturesInNpc([
        ...oldClass.system.base_features,
        ...oldClass.system.optional_features,
      ]);
      if (classFeatures.length) {
        // Delete the old class and its features
        await this._safeDeleteDescendant("Item", [oldClass, ...classFeatures]);
        needsRefresh = true;
      }
    }

    // And add all new features
    let baseFeatures = (await Promise.all(
      Array.from(newClass.system.base_features).map(lid => fromLid(lid))
    )) as LancerItem[];
    await insinuate(
      baseFeatures.filter(x => x),
      this
    );
    needsRefresh = true;
    if (newClass.is_npc_class()) {
      await this.swapFrameImage(newClass);
    }

    // If a new item was added, fill our hp, stress, and structure to match new maxes
    if (needsRefresh) {
      // Update this, to re-populate arrays etc to reflect new item
      await this.update({
        "system.hp.value": this.system.hp.max,
        "system.stress.value": this.system.stress.max,
        "system.structure.value": this.system.structure.max,
      });
    }
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
    // @ts-expect-error Infinite recursion for some reason
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
    // @ts-expect-error Infinite recursion for some reason
    if (x instanceof TokenDocument) x = x.actor!;
    if (!(x instanceof LancerActor)) {
      let message = `${messagePrefix ? messagePrefix + " | " : ""}Document ${x} not an actor.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    return x;
  }

  async statChangeScrollingText(data: unknown) {
    // Show scrolling text above the token on overshield, hp, burn, and heat changes
    const tokenId = this.token?.id || canvas?.scene?.tokens.find(t => t.actor?.id === this.id)?.id;
    if (!tokenId) return;

    const scrollingTexts: Array<TokenScrollTextOptions> = [];
    // Overshield
    if ((data as any).system?.overshield?.value !== undefined) {
      const val = this.system.overshield.value - (data as any).system.overshield.value;
      if (val) {
        scrollingTexts.push({
          tokenId,
          content: `${val < 0 ? "+" : "-"}${Math.abs(val).toString()} Overshield`,
          style: {
            anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
            direction: val < 0 ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
            fill: "0x9f6bff",
          },
        });
      }
    }
    // HP
    if ((data as any).system?.hp?.value !== undefined) {
      const val = this.system.hp.value - (data as any).system.hp.value;
      if (val) {
        scrollingTexts.push({
          tokenId,
          content: `${val < 0 ? "+" : "-"}${Math.abs(val).toString()} HP`,
          style: {
            anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
            direction: val < 0 ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
            fill: "0xc2e03e",
          },
        });
      }
    }
    // Burn
    if ((data as any).system?.burn !== undefined) {
      const val = this.system.burn - (data as any).system.burn;
      if (val) {
        scrollingTexts.push({
          tokenId,
          content: `${val < 0 ? "+" : "-"}${Math.abs(val).toString()} Burn`,
          style: {
            anchor: CONST.TEXT_ANCHOR_POINTS.BOTTOM,
            direction: val < 0 ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
            fill: "0xc43333",
          },
        });
      }
    }
    // Heat
    if (this.hasHeatcap() && (data as any).system?.heat?.value !== undefined) {
      const val = this.system.heat.value - (data as any).system.heat.value;
      if (val) {
        scrollingTexts.push({
          tokenId,
          content: `${val < 0 ? "+" : "-"}${Math.abs(val).toString()} Heat`,
          style: {
            anchor: CONST.TEXT_ANCHOR_POINTS.BOTTOM,
            direction: val < 0 ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
            fill: "0xc76f38",
          },
        });
      }
    }
    // Structure
    if ((this.is_mech() || this.is_npc()) && (data as any).system?.structure?.value !== undefined) {
      const val = this.system.structure.value - (data as any).system.structure.value;
      if (val) {
        scrollingTexts.push({
          tokenId,
          content: `${val < 0 ? "+" : "-"}${Math.abs(val).toString()} Structure`,
          style: {
            anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
            direction: val < 0 ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
            fill: "0x1f9eff",
          },
        });
      }
    }
    // Stress
    if ((this.is_mech() || this.is_npc()) && (data as any).system?.stress?.value !== undefined) {
      const val = this.system.stress.value - (data as any).system.stress.value;
      if (val) {
        scrollingTexts.push({
          tokenId,
          content: `${val < 0 ? "+" : "-"}${Math.abs(val).toString()} Stress`,
          style: {
            anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
            direction: val < 0 ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
            fill: "0xff7b00",
          },
        });
      }
    }
    // Repairs
    if (this.is_mech() && (data as any).system?.repairs !== undefined) {
      const val = this.system.repairs.value - (data as any).system.repairs.value;
      if (val) {
        scrollingTexts.push({
          tokenId,
          content: `${val < 0 ? "+" : "-"}${Math.abs(val).toString()} Repairs`,
          style: {
            anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
            direction: val < 0 ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
            fill: "0x8c8c8c",
          },
        });
      }
    }

    // Now, show each one in sequence
    for (const text of scrollingTexts) {
      // Delay a bit so the text doesn't all overlap
      await new Promise(resolve => setTimeout(resolve, 250));
      // Showing the next scrolling text
      tokenScrollText(text, true);
    }
  }

  async beginFullRepairFlow(title?: string): Promise<boolean> {
    if (this.is_deployable()) {
      return false;
    }
    const flow = new FullRepairFlow(this, title ? { title } : undefined);
    return await flow.begin();
  }

  async beginStabilizeFlow(title?: string): Promise<boolean> {
    if (!this.is_mech() && !this.is_npc()) {
      return false;
    }
    const flow = new StabilizeFlow(this, title ? { title } : undefined);
    return await flow.begin();
  }

  async beginOverchargeFlow(): Promise<boolean> {
    if (!this.is_mech()) {
      ui.notifications!.warn(`Only mechs can overcharge!`);
      return false;
    }
    const flow = new OverchargeFlow(this);
    return await flow.begin();
  }

  async beginRechargeFlow(): Promise<boolean> {
    if (!this.is_npc()) {
      ui.notifications!.warn(`Only NPCs can recharge!`);
      return false;
    }
    const flow = new NPCRechargeFlow(this);
    return await flow.begin();
  }

  async beginStatFlow(path: string, title?: string): Promise<boolean> {
    const flow = new StatRollFlow(this, { path, title });
    return await flow.begin();
  }

  async beginBurnFlow(title?: string): Promise<boolean> {
    const flow = new BurnFlow(this, { title });
    return await flow.begin();
  }

  async beginBasicAttackFlow(title?: string): Promise<boolean> {
    const flow = new BasicAttackFlow(this, title ? { title } : undefined);
    return await flow.begin();
  }

  async beginDamageFlow(title?: string): Promise<boolean> {
    const flow = new DamageRollFlow(this, title ? { title } : undefined);
    return await flow.begin();
  }

  async beginBasicTechAttackFlow(title?: string): Promise<boolean> {
    if (!this.is_mech() && !this.is_npc()) {
      ui.notifications!.warn(`Only mechs and NPCs can tech attack!`);
      return false;
    }
    const params = {
      title,
      invade: true,
    };
    const flow = new TechAttackFlow(this, params);
    return await flow.begin();
  }

  async beginStructureFlow(): Promise<boolean> {
    const flow = new StructureFlow(this);
    return await flow.begin();
  }

  async beginOverheatFlow(): Promise<boolean> {
    const flow = new OverheatFlow(this);
    return await flow.begin();
  }

  async tallyBondXP() {
    if (!this.is_pilot()) return;
    let totalIncrease = 0;
    for (const ideal of this.system.bond_state.xp_checklist.major_ideals) {
      if (ideal) totalIncrease += 1;
    }
    if (this.system.bond_state.xp_checklist.minor_ideal) totalIncrease += 1;
    if (this.system.bond_state.xp_checklist.veteran_power) totalIncrease += 1;
    if (totalIncrease) {
      await this.update({
        [`system.bond_state.xp.value`]: this.system.bond_state.xp.value + totalIncrease,
      });
      await this.update({
        "system.bond_state.xp_checklist": {
          major_ideals: [false, false, false],
          minor_ideal: false,
          veteran_power: false,
        },
      });
    }
  }

  // Called as part of foundry document initialization process
  static migrateData(source: any) {
    // Note: Don't bother fixing prototypeToken, as LancerTokenDocument handles that itself

    // ...

    return super.migrateData(source);
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
