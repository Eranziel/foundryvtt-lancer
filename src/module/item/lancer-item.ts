import { LANCER, TypeIcon } from "../config";
import { SystemData, SystemDataType, SystemTemplates } from "../system-template";
import { SourceDataType } from "../source-template";
import { DamageType, EntryType, EntryTypeLidPrefix, NpcFeatureType, RangeType, WeaponType } from "../enums";
import { ActionData } from "../models/bits/action";
import { RangeData, Range } from "../models/bits/range";
import { Tag } from "../models/bits/tag";
import { LancerActiveEffect } from "../effects/lancer-active-effect";
import {
  bonusAffectsWeapon,
  convertBonus,
  frameInnateEffect as frameInnate,
  npcClassInnateEffect as npcClassInnate,
  npcFeatureBonusEffects,
  npcFeatureOverrideEffects,
} from "../effects/converter";
import { BonusData } from "../models/bits/bonus";
import { LancerMECH, LancerNPC, LancerPILOT } from "../actor/lancer-actor";
import { Damage, DamageData } from "../models/bits/damage";
import { WeaponAttackFlow } from "../flows/attack";
import { TechAttackFlow } from "../flows/tech";
import { fixupPowerUses } from "../models/bits/power";
import { BondPowerFlow } from "../flows/bond";
import { ActivationFlow } from "../flows/activation";
import { CoreActiveFlow } from "../flows/frame";
import { StatRollFlow } from "../flows/stat";
import { SystemFlow } from "../flows/system";
import { DamageRollFlow } from "../flows/damage";
import { randomString } from "../util/lid";
import { generateItemID } from "../util/lcps";

const lp = LANCER.log_prefix;

interface LancerItemDataSource<T extends LancerItemType> {
  type: T;
  system: SourceDataType<T>;
}
interface LancerItemDataProperties<T extends LancerItemType> {
  type: T;
  system: SystemDataType<T>;
}

/**
 * Union type for Item.data._source. Only really used in prepareData
 */
type LancerItemSource =
  | LancerItemDataSource<EntryType.CORE_BONUS>
  | LancerItemDataSource<EntryType.FRAME>
  | LancerItemDataSource<EntryType.LICENSE>
  | LancerItemDataSource<EntryType.MECH_SYSTEM>
  | LancerItemDataSource<EntryType.MECH_WEAPON>
  | LancerItemDataSource<EntryType.NPC_CLASS>
  | LancerItemDataSource<EntryType.NPC_FEATURE>
  | LancerItemDataSource<EntryType.NPC_TEMPLATE>
  | LancerItemDataSource<EntryType.ORGANIZATION>
  | LancerItemDataSource<EntryType.PILOT_ARMOR>
  | LancerItemDataSource<EntryType.PILOT_GEAR>
  | LancerItemDataSource<EntryType.PILOT_WEAPON>
  | LancerItemDataSource<EntryType.RESERVE>
  | LancerItemDataSource<EntryType.SKILL>
  | LancerItemDataSource<EntryType.STATUS>
  | LancerItemDataSource<EntryType.TALENT>
  | LancerItemDataSource<EntryType.BOND>
  | LancerItemDataSource<EntryType.WEAPON_MOD>;

/**
 * Union type for Item.data
 * Can be discriminated by testing Item.data.type
 */
type LancerItemProperties =
  | LancerItemDataProperties<EntryType.CORE_BONUS>
  | LancerItemDataProperties<EntryType.FRAME>
  | LancerItemDataProperties<EntryType.LICENSE>
  | LancerItemDataProperties<EntryType.MECH_SYSTEM>
  | LancerItemDataProperties<EntryType.MECH_WEAPON>
  | LancerItemDataProperties<EntryType.NPC_CLASS>
  | LancerItemDataProperties<EntryType.NPC_FEATURE>
  | LancerItemDataProperties<EntryType.NPC_TEMPLATE>
  | LancerItemDataProperties<EntryType.ORGANIZATION>
  | LancerItemDataProperties<EntryType.PILOT_ARMOR>
  | LancerItemDataProperties<EntryType.PILOT_GEAR>
  | LancerItemDataProperties<EntryType.PILOT_WEAPON>
  | LancerItemDataProperties<EntryType.RESERVE>
  | LancerItemDataProperties<EntryType.SKILL>
  | LancerItemDataProperties<EntryType.STATUS>
  | LancerItemDataProperties<EntryType.TALENT>
  | LancerItemDataProperties<EntryType.BOND>
  | LancerItemDataProperties<EntryType.WEAPON_MOD>;

declare global {
  interface SourceConfig {
    Item: LancerItemSource;
  }
  interface DataConfig {
    Item: LancerItemProperties;
  }
  interface DocumentClassConfig {
    Item: typeof LancerItem;
  }
}

export class LancerItem extends Item {
  // @ts-expect-error - Foundry initializes this.
  system:
    | SystemData.CoreBonus
    | SystemData.Frame
    | SystemData.License
    | SystemData.MechSystem
    | SystemData.MechWeapon
    | SystemData.WeaponMod
    | SystemData.NpcClass
    | SystemData.NpcFeature
    | SystemData.NpcTemplate
    | SystemData.Organization
    | SystemData.PilotArmor
    | SystemData.PilotGear
    | SystemData.PilotWeapon
    | SystemData.Reserve
    | SystemData.Skill
    | SystemData.Status
    | SystemData.Talent
    | SystemData.Bond;

  /**
   * Returns all ranges for the item that match the provided range types
   */
  rangesFor(types: Set<RangeType> | RangeType[]): RangeData[] {
    const i = null as unknown as Item; // TODO remove

    const filter = new Set(types);
    switch (this.type) {
      case EntryType.MECH_WEAPON:
        // @ts-expect-error Should be fixed with v10 types
        const p = this.system.selected_profile_index;
        // @ts-expect-error Should be fixed with v10 types
        return this.system.profiles[p].range.filter(r => filter.has(r.type));
      case EntryType.PILOT_WEAPON:
        // @ts-expect-error Should be fixed with v10 types
        return this.system.range.filter(r => filter.has(r.type));
      case EntryType.NPC_FEATURE:
        // @ts-expect-error Should be fixed with v10 types
        if (this.system.type !== NpcFeatureType.Weapon) return [];
        // @ts-expect-error Should be fixed with v10 types
        return this.system.range.filter(r => filter.has(r.type));
      default:
        return [];
    }
  }

  currentProfile(): { range: RangeData[]; damage?: DamageData[]; accuracy?: number; attack?: number } {
    const result: { range: RangeData[]; damage?: DamageData[]; accuracy?: number; attack?: number } = {
      range: [],
    };
    if (this.is_mech_weapon()) {
      const p = this.system.selected_profile_index;
      result.range.push(...this.system.profiles[p].range);
      result.damage = result.damage ?? [];
      result.damage.push(...this.system.profiles[p].damage);
    } else if (this.is_pilot_weapon()) {
      result.range.push(...this.system.range);
      result.damage = result.damage ?? [];
      result.damage.push(...this.system.damage);
    } else if (
      this.is_npc_feature() &&
      (this.system.type === NpcFeatureType.Weapon || this.system.type === NpcFeatureType.Tech)
    ) {
      let tier = 0;
      if (this.actor) {
        tier = ((this.actor as LancerNPC).system.tier ?? 1) - 1;
      }
      if (this.system.type === NpcFeatureType.Weapon) {
        // Weapons have range and damage
        result.range.push(...this.system.range);
        result.damage = result.damage ?? [];
        result.damage.push(...this.system.damage[tier]);
      } else {
        // Must be a tech system. Use sensor range as the range.
        result.range.push({ type: RangeType.Range, val: this.actor?.system.sensor_range || 5 });
      }
      result.accuracy = this.system.accuracy ? this.system.accuracy[tier] : 0;
      result.attack = this.system.attack_bonus ? this.system.attack_bonus[tier] : 0;
    } else if (this.is_mech_system() || this.is_frame()) {
      // PC Tech attacks. Use sensor range as the range.
      result.range.push({ type: RangeType.Range, val: this.actor?.system.sensor_range || 5 });
    } else if (this.is_talent()) {
      // PC Tech attack from a talent - get the pilot's active mech's sensor range.
      result.range.push({
        type: RangeType.Range,
        val: (this.actor as LancerPILOT)?.system.active_mech?.value?.system.sensor_range || 5,
      });
    }
    return result;
  }

  /** Sets this item to its default equipped state */
  _resetEquipped() {
    // Default equipped based on if its something that must manually be equipped,
    // or is just inherently equipped
    switch (this.type) {
      case EntryType.MECH_SYSTEM:
      case EntryType.MECH_WEAPON:
      case EntryType.WEAPON_MOD:
      case EntryType.FRAME:
      case EntryType.PILOT_GEAR:
      case EntryType.PILOT_ARMOR:
      case EntryType.PILOT_WEAPON:
        // @ts-expect-error
        this.system.equipped = false;
        break;
      default:
        // @ts-expect-error
        this.system.equipped = true;
        break;
    }
  }

  /**
   * Perform preliminary item preparation.
   * Set equipped to its initial value (to be later finalized)
   * Set active weapon profile
   * Set limited max based on tags
   */
  prepareBaseData() {
    super.prepareBaseData();
    // Some modules create items with type "base", or potentially others we don't care about
    //@ts-expect-error V12 typing in progress
    if (!ITEM_TYPES.includes(this.type)) return;

    // Collect all tags on mech weapons
    if (this.is_mech_weapon()) {
      this.system.all_base_tags = this.system.profiles.flatMap(p => p.tags);
      this.system.all_tags = [];
      this.system.active_profile = this.system.profiles[this.system.selected_profile_index] ?? this.system.profiles[0];
      for (let p of this.system.profiles) {
        p.bonus_tags = [];
        p.bonus_range = [];
        p.bonus_damage = [];
        p.all_tags = [];
        p.all_range = [];
        p.all_damage = [];
      }
    } else if (this.is_npc_feature()) {
      if (this.system.lid === "") {
        this.system.lid = this.id!;
      }
      if (this.system.type === NpcFeatureType.Weapon) {
        if (!this.system.damage || this.system.damage.length < 3) {
          this.system.damage = [[], [], []];
        }
      }
    } else if (this.is_talent()) {
      // Talent apply unlocked items
      let unlocked_ranks = this.system.ranks.slice(0, this.system.curr_rank);
      this.system.actions = unlocked_ranks.flatMap(a => a.actions);
      this.system.bonuses = unlocked_ranks.flatMap(a => a.bonuses);
      this.system.counters = unlocked_ranks.flatMap(a => a.counters);
      this.system.synergies = unlocked_ranks.flatMap(a => a.synergies);
      // TODO - handle exclusive
    } else if (this.is_bond()) {
      // Construct uses from frequency
      this.system.powers = this.system.powers.map(p => fixupPowerUses(p));
    }

    if (!this.actor) {
      // This would ordinarily be called by our parent actor. We must do it ourselves.
      this.prepareFinalAttributes();
    }
  }

  /**
   * Method used by mech weapons (and perhaps some other miscellaneous items???) to prepare their individual stats
   * using bonuses.
   *
   * Note that it is still necessary that items without actors call this in order to prepare weapon tags
   */
  prepareFinalAttributes(): void {
    // Build final arrays of bonus_damage/range based on mods and actor bonuses
    if (this.is_mech_weapon()) {
      // Add mod bonuses to all profiles
      for (let profile of this.system.profiles) {
        if (this.system.mod) {
          profile.bonus_damage.push(...this.system.mod.system.added_damage);
          profile.bonus_range.push(...this.system.mod.system.added_range);
          profile.bonus_tags.push(...this.system.mod.system.added_tags);
        }

        // Add all bonuses.
        for (let b of (this.actor as LancerMECH | null)?.system.bonuses.weapon_bonuses || []) {
          // Every type of actor has bonuses so this isn't a dangerous cast
          if (!bonusAffectsWeapon(this, b)) continue;
          if (b.lid == "damage") {
            profile.bonus_damage.push(
              new Damage({
                type: profile.damage[0]?.type ?? DamageType.Variable,
                val: b.val,
              })
            );
          } else if (b.lid == "range") {
            if (this.system.active_profile.type == WeaponType.Melee) {
              profile.bonus_range.push(
                new Range({
                  type: RangeType.Threat,
                  val: parseInt(b.val) ?? 0,
                })
              );
            } else {
              profile.bonus_range.push(
                new Range({
                  type: RangeType.Range,
                  val: parseInt(b.val) ?? 0,
                })
              );
            }
          }
        }

        // Crunch down the Damage and Range
        profile.bonus_damage = Damage.CombineLists([], profile.bonus_damage);
        profile.bonus_range = Range.CombineLists([], profile.bonus_range);

        // Finally, form combined damages/ranges/tags for the profile
        profile.all_damage = Damage.CombineLists(profile.damage, profile.bonus_damage);
        profile.all_range = Range.CombineLists(profile.range, profile.bonus_range);
        profile.all_tags = Tag.MergeTags(profile.tags, profile.bonus_tags);

        // "all_tags" is rarely what you actually want to use, but can be useful as a litmus test of what tags are present on the weapon as a whole
        this.system.all_tags = Tag.MergeTags(this.system.all_tags, profile.all_tags);
      }
    }

    // Apply limited max from tags, as applicable
    let tags = this.getTags() ?? [];
    let lim_tag = tags.find(t => t.is_limited);
    if (lim_tag && this._hasUses()) {
      this.system.uses.max = lim_tag.num_val ?? 0; // We will apply bonuses later
    }

    // We can then finally apply limited bonuses from our parent
    if (this.actor?.is_mech()) {
      if (this._hasUses() && this.system.uses.max) {
        this.system.uses.max += this.actor.system.loadout.limited_bonus;
      }
    }
  }

  /** @override
   * Want to preserve our arrays
   */
  async update(data: any, options = {}) {
    // @ts-expect-error
    data = this.system.full_update_data(data);
    return super.update(data, options);
  }

  /**
   * Generates the effect data for this items bonuses and innate effects (such as those from armor, a frame, etc).
   * Generates no effects if item is destroyed, or unequipped.
   * Result will be a mix of
   * - Bonus effects (aka from compcon Bonus type bonuses)
   * - Innate effects (e.x. the statistical affect of a frames base stats)
   * Result is a temporary ActiveEffect document - it is not persisted to DB
   */
  _generateEphemeralEffects(): LancerActiveEffect[] {
    // Destroyed items produce no effects
    if ((this as any).destroyed === true || !this.isEquipped()) return [];

    // Generate from bonuses + innate effects
    let effects = [];
    let bonus_groups: {
      // Converted & added to effects later
      group?: string;
      bonuses: BonusData[];
    }[] = [];

    switch (this.type) {
      case EntryType.FRAME:
        let frame = this as unknown as LancerFRAME;
        bonus_groups.push({
          group: frame.system.core_system.passive_name || frame.system.core_system.name,
          bonuses: frame.system.core_system.passive_bonuses,
        });
        for (let trait of frame.system.traits) {
          bonus_groups.push({
            group: trait.name,
            bonuses: trait.bonuses,
          });
        }
        effects.push(frameInnate(this as unknown as LancerFRAME));
        break;
      case EntryType.NPC_CLASS:
        effects.push(npcClassInnate(this as unknown as LancerNPC_CLASS));
        break;
      case EntryType.NPC_FEATURE:
        let be = npcFeatureBonusEffects(this as unknown as LancerNPC_FEATURE);
        let oe = npcFeatureOverrideEffects(this as unknown as LancerNPC_FEATURE);
        if (be) effects.push(be);
        if (oe) effects.push(oe);
        break;
      case EntryType.PILOT_ARMOR:
      case EntryType.PILOT_GEAR:
      case EntryType.PILOT_WEAPON:
      case EntryType.MECH_SYSTEM:
      case EntryType.WEAPON_MOD:
      case EntryType.CORE_BONUS:
      case EntryType.TALENT:
        bonus_groups.push({ bonuses: (this as any).system.bonuses });
        break;
      case EntryType.MECH_WEAPON:
        let tamw = this as unknown as LancerMECH_WEAPON;
        bonus_groups.push({
          group: tamw.system.active_profile.name || tamw.system.active_profile?.name,
          bonuses: tamw.system.active_profile.bonuses,
        });
        break;
    } // Nothing else needs particular care

    // Convert bonuses
    effects.push(
      ...bonus_groups
        .flatMap(bg => bg.bonuses.map(b => convertBonus(this, bg.group ? `${this.name} - ${bg.group}` : this.name!, b)))
        .filter(b => b)
    );

    return effects.map(e => new LancerActiveEffect(e as object, { parent: this }));
  }

  /** @inheritdoc */
  static async _onDeleteOperation() {
    // Default implementation of this will delete active effects associated with this object.
    // We do that ourselves using effectManager, so to prevent fighting we disable this here
  }

  protected async _preCreate(...[data, options, user]: Parameters<Item["_preCreate"]>): Promise<boolean | void> {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    // Select default image
    let icon_lookup: string = this.type;
    if (this.is_npc_feature()) {
      icon_lookup += this.type;
    }
    let img = TypeIcon(icon_lookup);

    // If base item has data, then we are probably importing. Skip 90% of our import procedures
    // @ts-expect-error Should be fixed with v10 types
    if (data.system?.lid) {
      console.log(`${lp} New ${this.type} has data provided from an import, skipping default init.`);
      if (!data?.img || data.img == "icons/svg/item-bag.svg") {
        this.updateSource({ img });
      }
      return;
    }

    console.log(`${lp} Initializing new ${this.type}`);
    const name = this.name ?? `New ${this.type}`;
    this.updateSource({
      img: img,
      name,
      system: {
        lid: `${generateItemID(EntryTypeLidPrefix(this.type as EntryType), name)}-${randomString(8)}`,
      },
    });
  }

  // Typeguards
  is_core_bonus(): this is LancerCORE_BONUS {
    return this.type === EntryType.CORE_BONUS;
  }
  is_frame(): this is LancerFRAME {
    return this.type === EntryType.FRAME;
  }
  is_license(): this is LancerLICENSE {
    return this.type === EntryType.LICENSE;
  }
  is_mech_system(): this is LancerMECH_SYSTEM {
    return this.type === EntryType.MECH_SYSTEM;
  }
  is_mech_weapon(): this is LancerMECH_WEAPON {
    return this.type === EntryType.MECH_WEAPON;
  }
  is_npc_class(): this is LancerNPC_CLASS {
    return this.type === EntryType.NPC_CLASS;
  }
  is_npc_feature(): this is LancerNPC_FEATURE {
    return this.type === EntryType.NPC_FEATURE;
  }
  is_npc_template(): this is LancerNPC_TEMPLATE {
    return this.type === EntryType.NPC_TEMPLATE;
  }
  is_organization(): this is LancerORGANIZATION {
    return this.type === EntryType.ORGANIZATION;
  }
  is_pilot_armor(): this is LancerPILOT_ARMOR {
    return this.type === EntryType.PILOT_ARMOR;
  }
  is_pilot_gear(): this is LancerPILOT_GEAR {
    return this.type === EntryType.PILOT_GEAR;
  }
  is_pilot_weapon(): this is LancerPILOT_WEAPON {
    return this.type === EntryType.PILOT_WEAPON;
  }
  is_reserve(): this is LancerRESERVE {
    return this.type === EntryType.RESERVE;
  }
  is_skill(): this is LancerSKILL {
    return this.type === EntryType.SKILL;
  }
  is_status(): this is LancerSTATUS {
    return this.type === EntryType.STATUS;
  }
  is_talent(): this is LancerTALENT {
    return this.type === EntryType.TALENT;
  }
  is_bond(): this is LancerBOND {
    return this.type === EntryType.BOND;
  }
  is_weapon_mod(): this is LancerWEAPON_MOD {
    return this.type === EntryType.WEAPON_MOD;
  }
  is_weapon(): this is LancerMECH_WEAPON | LancerPILOT_WEAPON | LancerNPC_FEATURE {
    return this.is_mech_weapon() || this.is_pilot_weapon() || (this.is_npc_feature() && this.system.type === "Weapon");
  }

  // Quick checkers/getters
  getTags(): Tag[] | null {
    if (
      this.is_pilot_armor() ||
      this.is_pilot_gear() ||
      this.is_pilot_weapon() ||
      this.is_mech_system() ||
      this.is_npc_feature() ||
      this.is_weapon_mod() ||
      this.is_core_bonus()
    ) {
      return this.system.tags;
    } else if (this.is_mech_weapon()) {
      return this.system.active_profile.all_tags;
    } else if (this.is_frame()) {
      return this.system.core_system.tags;
    } else {
      return null;
    }
  }

  getBonuses(): BonusData[] | null {
    if (
      this.is_pilot_armor() ||
      this.is_pilot_gear() ||
      this.is_pilot_weapon() ||
      this.is_mech_system() ||
      this.is_core_bonus()
    ) {
      return this.system.bonuses;
    } else if (this.is_mech_weapon()) {
      return this.system.active_profile.bonuses;
    } else if (this.is_frame()) {
      if (this.actor && (this.actor as LancerMECH).system.core_active) {
        return [...this.system.core_system.passive_bonuses, ...this.system.core_system.active_bonuses];
      } else {
        return this.system.core_system.passive_bonuses;
      }
    } else {
      return null;
    }
  }

  // Returns this items limit tag value
  getLimitedBase(): number | null {
    let lim_tag = this.getTags()?.find(t => t.is_limited);
    if (lim_tag) {
      return lim_tag.num_val;
    } else {
      return null;
    }
  }

  // Returns true & type info if this item tracks uses (whether or not it has the limited tag)
  _hasUses(): this is { system: SystemTemplates.uses } {
    return (this as any).system.uses !== undefined;
  }

  // Returns true & type info if this has the limited tag
  isLimited(): this is { system: SystemTemplates.uses } {
    return this._hasUses() && this.system.uses.max > 0;
  }

  // Returns true if this has the loading tag
  isLoading(): boolean {
    return (this.getTags() ?? []).some(t => t.is_loading);
  }

  isRecharge(): boolean {
    return (this.getTags() ?? []).some(t => t.is_recharge);
  }

  isUnique(): boolean {
    return (this.getTags() ?? []).some(t => t.is_unique);
  }

  isAI(): boolean {
    return (this.getTags() ?? []).some(t => t.is_ai);
  }

  isSmart(): boolean {
    return (this.getTags() ?? []).some(t => t.is_smart);
  }

  isAP(): boolean {
    return (this.getTags() ?? []).some(t => t.is_ap);
  }

  isOverkill(): boolean {
    return (this.getTags() ?? []).some(t => t.is_overkill);
  }

  isReliable(): boolean {
    return (this.getTags() ?? []).some(t => t.is_reliable);
  }

  // Returns true & type information if this item has action data
  hasActions(): this is { system: { actions: ActionData[] } } {
    return (this as any).system.actions !== undefined;
  }

  // Returns true either if this is equipped, or if equipping has no meaning. False if not on an actor
  isEquipped(): boolean {
    let eq = (this as any).system.equipped;
    return this.actor ? eq : false;
  }

  // Checks that the provided document is not null, and is a lancer actor
  static async fromUuid(x: string | LancerItem, messagePrefix?: string): Promise<LancerItem> {
    if (x instanceof LancerItem) return x;
    x = (await fromUuid(x)) as LancerItem;
    if (!x) {
      let message = `${messagePrefix ? messagePrefix + " | " : ""}Item ${x} not found.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    if (!(x instanceof LancerItem)) {
      let message = `${messagePrefix ? messagePrefix + " | " : ""}Document ${x} not an item.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    return x;
  }

  // Checks that the provided document is not null, and is a lancer actor
  static fromUuidSync(x: string | LancerItem, messagePrefix?: string): LancerItem {
    if (x instanceof LancerItem) return x;
    x = fromUuidSync(x) as LancerItem;
    if (!x) {
      let message = `${messagePrefix ? messagePrefix + " | " : ""}Item ${x} not found.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    if (!(x instanceof LancerItem)) {
      let message = `${messagePrefix ? messagePrefix + " | " : ""}Document ${x} not an item.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    return x;
  }

  async beginWeaponAttackFlow() {
    if (!this.is_mech_weapon() && !this.is_npc_feature() && !this.is_pilot_weapon()) {
      ui.notifications!.error(`Item ${this.id} cannot attack as it is not a weapon!`);
      return;
    }
    const flow = new WeaponAttackFlow(this);
    await flow.begin();
    console.log("Finished attack flow");
  }

  async beginTechAttackFlow() {
    if (!this.is_mech_system() && !this.is_npc_feature()) {
      ui.notifications!.error(`Item ${this.id} cannot attack as it is not a system!`);
      return;
    }
    const flow = new TechAttackFlow(this);
    await flow.begin();
  }

  async beginDamageFlow() {
    if (!this.is_mech_weapon() && !this.is_npc_feature() && !this.is_pilot_weapon()) {
      ui.notifications!.error(`Item ${this.id} cannot roll damage as it is not a weapon!`);
      return;
    }
    const flow = new DamageRollFlow(this, { title: `${this.name} damage` });
    await flow.begin();
  }

  async beginSystemFlow() {
    if (!this.is_mech_system() && !this.is_weapon_mod() && !this.is_npc_feature()) {
      ui.notifications!.error(`Item ${this.id} is not a mech system, weapon mod, or NPC feature!`);
      return;
    }
    const flow = new SystemFlow(this);
    await flow.begin();
  }

  async beginActivationFlow(path?: string) {
    if (!path) {
      // If no path is provided, default to the first action
      // @ts-expect-error We know it doesn't exist on all types, that's why we're checking
      if (!this.system.actions || this.system.actions.length < 1) {
        ui.notifications!.error(`Item ${this.id} has no actions, how did you even get here?`);
        return;
      }
      path = "system.actions.0";
    }
    let flow;
    // If this is a Core System activation without a specific action
    if (this.is_frame() && path === "system.core_system") {
      this.beginCoreActiveFlow(path);
      return;
    } else {
      flow = new ActivationFlow(this, { action_path: path });
    }
    await flow.begin();
    console.log("Finished activation flow");
  }

  async beginCoreActiveFlow(path?: string) {
    if (!this.is_frame()) {
      ui.notifications!.error(`Item ${this.id} is not a mech frame!`);
      return;
    }
    path = path ?? "system.core_system";
    console.log("Core system activation flow on path", path);
    const actionName = this.system.core_system.active_actions[0]?.name ?? this.system.core_system.active_name;
    // Construct a fake "action" for the frame's core system
    const action: ActionData = {
      lid: this.system.lid + "_core_system",
      name: `CORE ACTIVATION :: ${actionName}`,
      activation: this.system.core_system.activation,
      detail: this.system.core_system.active_effect,
      // The rest doesn't matter, give it some defaults
      cost: 0,
      frequency: "",
      init: "",
      trigger: "",
      terse: "",
      pilot: false,
      mech: true,
      tech_attack: false,
      heat_cost: 0,
      synergy_locations: [],
      damage: [],
      range: [],
    };
    const flow = new CoreActiveFlow(this, { action, action_path: path });
    await flow.begin();
  }

  async beginSkillFlow() {
    if (!this.is_skill()) {
      ui.notifications!.error(`Item ${this.id} is not a skill!`);
      return;
    }
    const flow = new StatRollFlow(this, { path: "system.curr_rank" });
    await flow.begin();
  }

  async beginBondPowerFlow(powerIndex: number) {
    if (!this.is_bond()) {
      ui.notifications!.error(`Item ${this.id} has no bond powers!`);
      return;
    }
    const flow = new BondPowerFlow(this, { powerIndex });
    await flow.begin();
  }

  async refreshPowers() {
    if (!this.is_bond()) {
      ui.notifications!.error(`Item ${this.id} has no bond powers!`);
      return;
    }
    for (let i = 0; i < this.system.powers.length; i++) {
      const p = this.system.powers[i];
      if (p.uses) {
        await this.update({ [`system.powers.${i}.uses.value`]: p.uses.max });
      }
    }
  }
}

export type LancerCORE_BONUS = LancerItem & { system: SystemData.CoreBonus };
export type LancerFRAME = LancerItem & { system: SystemData.Frame };
export type LancerLICENSE = LancerItem & { system: SystemData.License };
export type LancerMECH_SYSTEM = LancerItem & { system: SystemData.MechSystem };
export type LancerMECH_WEAPON = LancerItem & { system: SystemData.MechWeapon };
export type LancerNPC_CLASS = LancerItem & { system: SystemData.NpcClass };
export type LancerNPC_FEATURE = LancerItem & { system: SystemData.NpcFeature };
export type LancerNPC_TEMPLATE = LancerItem & { system: SystemData.NpcTemplate };
export type LancerORGANIZATION = LancerItem & { system: SystemData.Organization };
export type LancerPILOT_ARMOR = LancerItem & { system: SystemData.PilotArmor };
export type LancerPILOT_GEAR = LancerItem & { system: SystemData.PilotGear };
export type LancerPILOT_WEAPON = LancerItem & { system: SystemData.PilotWeapon };
export type LancerRESERVE = LancerItem & { system: SystemData.Reserve };
export type LancerSKILL = LancerItem & { system: SystemData.Skill };
export type LancerSTATUS = LancerItem & { system: SystemData.Status };
export type LancerTALENT = LancerItem & { system: SystemData.Talent };
export type LancerBOND = LancerItem & { system: SystemData.Bond };
export type LancerWEAPON_MOD = LancerItem & { system: SystemData.WeaponMod };

// This seems like it could be removed eventually
export type LancerItemType =
  | EntryType.CORE_BONUS
  | EntryType.FRAME
  | EntryType.LICENSE
  | EntryType.MECH_WEAPON
  | EntryType.MECH_SYSTEM
  | EntryType.NPC_CLASS
  | EntryType.NPC_TEMPLATE
  | EntryType.NPC_FEATURE
  | EntryType.ORGANIZATION
  | EntryType.PILOT_ARMOR
  | EntryType.PILOT_WEAPON
  | EntryType.PILOT_GEAR
  | EntryType.RESERVE
  | EntryType.SKILL
  | EntryType.STATUS
  | EntryType.TALENT
  | EntryType.BOND
  | EntryType.WEAPON_MOD;
export const ITEM_TYPES = [
  EntryType.CORE_BONUS,
  EntryType.FRAME,
  EntryType.LICENSE,
  EntryType.MECH_WEAPON,
  EntryType.MECH_SYSTEM,
  EntryType.NPC_CLASS,
  EntryType.NPC_TEMPLATE,
  EntryType.NPC_FEATURE,
  EntryType.PILOT_ARMOR,
  EntryType.PILOT_WEAPON,
  EntryType.PILOT_GEAR,
  EntryType.RESERVE,
  EntryType.SKILL,
  EntryType.STATUS,
  EntryType.TALENT,
  EntryType.BOND,
  EntryType.WEAPON_MOD,
];
export function is_item_type(type: EntryType): type is LancerItemType {
  return ITEM_TYPES.includes(type);
}
