import { LANCER, TypeIcon } from "../config";
import { SystemData, SystemDataType, SystemTemplates } from "../system-template";
import { SourceData, SourceDataType } from "../source-template";
import { DamageType, EntryType, NpcFeatureType, RangeType, WeaponType } from "../enums";
import { ActionData } from "../models/bits/action";
import { RangeData, Range } from "../models/bits/range";
import { Tag } from "../models/bits/tag";
import { LancerActiveEffect, LancerActiveEffectConstructorData } from "../effects/lancer-active-effect";
import {
  bonusAffectsWeapon,
  convertBonus,
  frameInnateEffect as frameInnate,
  npcClassInnateEffect as npcClassInnate,
  npcFeatureBonusEffects,
  npcFeatureOverrideEffects,
} from "../effects/converter";
import { BonusData } from "../models/bits/bonus";
import { LancerMECH } from "../actor/lancer-actor";
import { Damage } from "../models/bits/damage";
import { WeaponAttackFlow } from "../flows/attack";
import { TechAttackFlow } from "../flows/tech";
import { fixupPowerUses } from "../models/bits/power";
import { BondPowerFlow } from "../flows/bond";

const lp = LANCER.log_prefix;

interface LancerItemDataSource<T extends LancerItemType> {
  type: T;
  data: SourceDataType<T>;
}
interface LancerItemDataProperties<T extends LancerItemType> {
  type: T;
  data: SystemDataType<T>;
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

    // Collect all tags on mech weapons
    if (this.is_mech_weapon()) {
      this.system.all_tags = this.system.profiles.flatMap(p => p.tags);
      this.system.active_profile = this.system.profiles[this.system.selected_profile_index] ?? this.system.profiles[0];
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

    // Apply limited max from tags, as applicable
    let tags = this.getTags() ?? [];
    let lim_tag = tags.find(t => t.is_limited);
    if (lim_tag && this._hasUses()) {
      this.system.uses.max = lim_tag.num_val ?? 0; // We will apply bonuses later
    }
  }

  /**
   * Method used by mech weapons (and perhaps some other miscellaneous items???) to prepare their individual stats
   * using the bonuses described in the provided synthetic actor.
   */
  prepareFinalAttributes(system: SystemData.Mech | SystemData.Pilot): void {
    // At the very least, we can apply limited bonuses from our parent
    if (this.actor?.is_mech()) {
      if (this._hasUses() && this.system.uses.max) {
        this.system.uses.max += (system as SystemData.Mech).loadout.limited_bonus;
      }
    }

    if (this.is_mech_weapon()) {
      // Add mod bonuses
      if (this.system.mod) {
        this.system.active_profile.bonus_damage = [...this.system.mod.system.added_damage];
        this.system.active_profile.bonus_range = [...this.system.mod.system.added_range];
        this.system.active_profile.bonus_tags = [...this.system.mod.system.added_tags];
      }

      // Add all bonuses
      let bonuses = (system as SystemData.Mech).all_bonuses;
      for (let b of bonuses) {
        if (b.lid == "damage") {
          if (!bonusAffectsWeapon(this, b)) continue;
          this.system.active_profile.bonus_damage.push(
            new Damage({
              type: this.system.active_profile.damage[0]?.type ?? DamageType.Variable,
              val: b.val,
            })
          );
        } else if (b.lid == "range") {
          if (!bonusAffectsWeapon(this, b)) continue;
          if (this.system.active_profile.type == WeaponType.Melee) {
            this.system.active_profile.bonus_range.push(
              new Range({
                type: RangeType.Threat,
                val: parseInt(b.val) ?? 0,
              })
            );
          } else {
            this.system.active_profile.bonus_range.push(
              new Range({
                type: RangeType.Range,
                val: parseInt(b.val) ?? 0,
              })
            );
          }
        }
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
    let effects: LancerActiveEffectConstructorData[] = [];
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
      ...(bonus_groups
        .flatMap(bg =>
          bg.bonuses.map(b => convertBonus(this.uuid, bg.group ? `${this.name} - ${bg.group}` : this.name!, b))
        )
        .filter(b => b) as LancerActiveEffectConstructorData[])
    );

    return effects.map(e => new LancerActiveEffect(e, { parent: this }));
  }

  /** @inheritdoc */
  static async _onDeleteDocuments() {
    // Default implementation of this will delete active effects associated with this object.
    // We do that ourselves using effectManager, so to prevent fighting we disable this here
  }

  protected async _preCreate(...[data, options, user]: Parameters<Item["_preCreate"]>): Promise<void> {
    await super._preCreate(data, options, user);

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
      if (!data.img || data.img == "icons/svg/item-bag.svg") {
        // @ts-expect-error Should be fixed with v10 types
        this.updateSource({ img });
      }
      return;
    }

    console.log(`${lp} Initializing new ${this.type}`);
    // @ts-expect-error Should be fixed with v10 types
    this.updateSource({
      img: img,
      name: this.name ?? `New ${this.type}`,
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
      return this.system.all_tags;
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
    console.log("Finished tech attack flow");
  }

  async beginBondPowerFlow(powerIndex: number) {
    if (!this.is_bond()) {
      ui.notifications!.error(`Item ${this.id} has no bond powers!`);
      return;
    }
    const flow = new BondPowerFlow(this, { powerIndex });
    await flow.begin();
    console.log("Finished bond power flow");
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
