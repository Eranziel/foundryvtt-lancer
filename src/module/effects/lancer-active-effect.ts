import type { EffectChangeData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/_types.mjs";
import { LancerActor } from "../actor/lancer-actor";
import { LANCER } from "../config";
import { DeployableType, EntryType } from "../enums";
import { LancerItem, LancerSTATUS } from "../item/lancer-item";
import { StatusIconConfigOptions } from "../settings";
import {
  baselineStatuses,
  cancerConditionsStatus,
  cancerNPCTemplates,
  defaultStatuses,
  hayleyConditionsStatus,
  hayleyNPC,
  hayleyPC,
  hayleyUtility,
  tommyConditionsStatus,
} from "../status-icons";
import { get_pack_id } from "../util/doc";

const lp = LANCER.log_prefix;

// Chassis = mech or standard npc
export type LancerEffectTarget =
  | EntryType.PILOT
  | EntryType.MECH
  | EntryType.NPC
  | EntryType.DEPLOYABLE
  | "only_drone"
  | "only_deployable"
  | "mech_and_npc";

export class LancerActiveEffect extends ActiveEffect {
  /**
   * Determine whether this Active Effect is suppressed or not.
   */
  get isSuppressed(): boolean {
    // Check it's not just passing through
    return !this.affectsUs();
  }

  /**
   * Determine whether this Active Effect is present only to be passed to descendants
   */
  affectsUs(): boolean {
    // Check right actor type
    let tf = this.flags[game.system.id];
    if (!tf?.target_type) {
      return true; // Safe bet - no target type, assume it affects us
    }

    // Otherwise got to get the parent
    let parent: LancerActor | null = null;
    if (this.parent instanceof LancerActor) {
      parent = this.parent;
    } else if (this.parent instanceof LancerItem) {
      parent = this.parent.parent;
    }

    // No parent? Just exit early, something's weird but not really our problem
    if (!(parent instanceof LancerActor)) {
      return false; // Doesn't matter
    }

    switch (tf.target_type) {
      case EntryType.PILOT:
        return parent.is_pilot();
      case EntryType.MECH:
        return parent.is_mech();
      case EntryType.DEPLOYABLE:
        return parent.is_deployable();
      case EntryType.NPC:
        return parent.is_npc();
      case "mech_and_npc":
        return parent.is_mech() || parent.is_npc();
      case "only_deployable":
        return parent.is_deployable() && parent.system.type == DeployableType.Deployable;
      case "only_drone":
        return parent.is_deployable() && parent.system.type == DeployableType.Drone;
      default:
        return false;
    }
  }

  /* --------------------------------------------- */

  /**
   * Prepare the data structure for Active Effects which are currently applied to an Actor or Item.
   */
  static prepareActiveEffectCategories(
    actor: LancerActor
  ): Array<{ type: string; label: string; effects: [number, LancerActiveEffect][] }> {
    // Define effect header categories
    let passives = {
      type: "passive",
      label: game.i18n.localize("lancer.effect.categories.passive"),
      effects: [] as [number, LancerActiveEffect][],
    };
    let inherited = {
      type: "inherited",
      label: game.i18n.localize("lancer.effect.categories.inherited"),
      effects: [] as [number, LancerActiveEffect][],
    };
    let disabled = {
      type: "disabled",
      label: game.i18n.localize("lancer.effect.categories.disabled"),
      effects: [] as [number, LancerActiveEffect][],
    };
    let passthrough = {
      type: "passthrough",
      label: game.i18n.localize("lancer.effect.categories.passthrough"),
      effects: [] as [number, LancerActiveEffect][],
    };

    // Iterate over active effects, classifying them into categories
    let index = 0;
    for (let e of actor.allApplicableEffects()) {
      // e._getSourceName(); // Trigger a lookup for the source name
      if (!e.affectsUs()) passthrough.effects.push([index, e]);
      else if (e.disabled) disabled.effects.push([index, e]);
      else if (e.flags[game.system.id]?.deep_origin) inherited.effects.push([index, e]);
      else passives.effects.push([index, e]);
      index++;
    }

    // categories.suppressed.hidden = !categories.suppressed.effects.length;
    return [passives, inherited, disabled, passthrough];
  }

  // Fully update the status icons in CONFIG.statusEffects.
  // This is not used on page load, since the two methods need to be run in different hooks.
  // Any time after that, though, both should be run together and in this order.
  static async updateIcons() {
    await this.initConfig();
    await this.populateFromCompendiumItems();
    await this.populateFromWorldItems();
    Hooks.callAll("lancer.statusesReady");
  }

  // Populate config with our static/compendium statuses instead of the builtin ones
  static async initConfig() {
    const statusIconConfig = game.settings.get(game.system.id, LANCER.setting_status_icons);
    // If no sets are selected, enable the default set
    if (game.ready && !Object.keys(statusIconConfig).some(k => (<any>statusIconConfig)[k])) {
      statusIconConfig.defaultConditionsStatus = true;
      await game.settings.set(game.system.id, LANCER.setting_status_icons, statusIconConfig);
    }

    /**
     * Helper function to populate the status config with the selected status icon set. For each icon in swapWith:
     * - If the status is already in statuses, leave it as-is
     * - If the status is not in statuses yet, add it
     * @param statuses The set of statuses being worked on, to be put back into CONFIG.statusEffects afterward
     * @param newStatuses The set of icons to swap in
     * @returns The statuses set with the icons swapped, and any missing statuses added.
     */
    function _backfillIcons(
      // @ts-expect-error v10 types
      statuses: StatusEffect[],
      newStatuses: { id: string; name: string; img: string }[]
      // @ts-expect-error v10 types
    ): StatusEffect[] {
      for (let icon of newStatuses) {
        let status = statuses.find(s => s.id === icon.id);
        if (!status) {
          statuses.push({
            id: icon.id,
            name: icon.name,
            img: icon.img,
          });
        }
      }
      return statuses;
    }

    // @ts-expect-error v10 types
    let configStatuses: StatusEffect[] = [];
    // Pull the default statuses from the compendium if it exists
    if (statusIconConfig.defaultConditionsStatus) {
      configStatuses = _backfillIcons(configStatuses, defaultStatuses);
    }
    if (statusIconConfig.cancerConditionsStatus) {
      configStatuses = _backfillIcons(configStatuses, cancerConditionsStatus);
    }
    if (statusIconConfig.hayleyConditionsStatus) {
      configStatuses = _backfillIcons(configStatuses, hayleyConditionsStatus);
    }
    if (statusIconConfig.tommyConditionsStatus) {
      configStatuses = _backfillIcons(configStatuses, tommyConditionsStatus);
    }
    // Always add baseline statuses to the end of the conditions/statuses group
    configStatuses = _backfillIcons(configStatuses, baselineStatuses);

    // Icons for other things which aren't mechanical condition/status
    if (statusIconConfig.cancerNPCTemplates) {
      configStatuses = _backfillIcons(configStatuses, cancerNPCTemplates);
    }
    if (statusIconConfig.hayleyPC) {
      configStatuses = _backfillIcons(configStatuses, hayleyPC);
    }
    if (statusIconConfig.hayleyNPC) {
      configStatuses = _backfillIcons(configStatuses, hayleyNPC);
    }
    if (statusIconConfig.hayleyUtility) {
      configStatuses = _backfillIcons(configStatuses, hayleyUtility);
    }
    console.log(`${lp} ${configStatuses.length} status icons configured from settings`);
    CONFIG.statusEffects = configStatuses;
    // Use downandout to mark units as defeated
    CONFIG.specialStatusEffects.DEFEATED = "downandout";
    // Disable the vision mechanics Foundry applies to certain status names
    // @ts-expect-error null to disable is valid
    CONFIG.specialStatusEffects.INVISIBLE = null;
    // @ts-expect-error null to disable is valid
    CONFIG.specialStatusEffects.BLIND = null;

    Hooks.callAll("lancer.statusInitComplete");
  }

  /**
   * Load statuses from the compendia and world items and backfill into CONFIG.statusEffects.
   */
  static async populateFromWorldItems() {
    const originalLength = CONFIG.statusEffects.length;
    const worldStatuses: LancerSTATUS[] = game.items?.filter(i => i.type === EntryType.STATUS) as LancerSTATUS[];
    this._populateFromItems(worldStatuses, true);
    console.log(
      `${lp} ${CONFIG.statusEffects.length - originalLength} status icons loaded from world items, total: ${
        CONFIG.statusEffects.length
      }`
    );
  }

  static async populateFromCompendiumItems() {
    const originalLength = CONFIG.statusEffects.length;
    const pack = game.packs.get(get_pack_id(EntryType.STATUS));
    const packStatuses: LancerSTATUS[] = ((await pack?.getDocuments({ type: EntryType.STATUS })) ||
      []) as unknown as LancerSTATUS[];
    this._populateFromItems(packStatuses, false);
    console.log(
      `${lp} ${CONFIG.statusEffects.length - originalLength} status icons loaded from compendiums, total: ${
        CONFIG.statusEffects.length
      }`
    );
  }

  static async _populateFromItems(items: LancerItem[] = [], overwrite = false) {
    if (!items.length) {
      return;
    }
    // Update the status icons with data from the items. Add any statuses which are missing, and populate descriptions.
    for (const status of items) {
      if (!status.is_status() || !status.system.lid || !status.img) continue;
      const existingStatus = CONFIG.statusEffects.find(s => s.id === status.system.lid);
      if (!existingStatus) {
        const effects = [...status.effects];
        const changes =
          effects.length > 0
            ? effects.reduce((e, all) => {
                // @ts-expect-error TS is dumb about reduce
                return all.concat(e.changes || []);
              }, [])
            : [];
        CONFIG.statusEffects.push({
          id: status.system.lid,
          name: status.name,
          // @ts-expect-error v12 property renamed
          img: status.img,
          description: status.system.effects,
          changes,
        });
      } else {
        // @ts-expect-error v12 property renamed
        existingStatus.img = existingStatus.img || existingStatus.icon;
        // @ts-expect-error v12 property renamed
        existingStatus.img = overwrite ? status.img || existingStatus.img : existingStatus.img || status.img;
        existingStatus.name = overwrite ? status.name || existingStatus.name : existingStatus.name || status.name;
        if (status.system.effects) {
          existingStatus.description = status.system.effects;
        }
        // If overwrite is on, replace the effect's changes with those from the item.
        if (overwrite && [...status.effects].length > 0) {
          const changes = existingStatus.changes || [];
          status.effects.forEach(e => {
            if (e.changes && e.changes.length > 0) {
              // @ts-expect-error ??
              changes.push(...e.changes);
            }
          });
          existingStatus.changes = changes;
        }
        // If not overwriting, insert the changes if the existing status doesn't have any changes.
        else if (!existingStatus.changes && status.effects.size) {
          const effects = [...status.effects];
          const changes =
            effects.length > 0
              ? effects.reduce((e, all) => {
                  // @ts-expect-error TS is dumb about reduce
                  return all.concat(e.changes || []);
                }, [])
              : [];
          existingStatus.changes = changes;
        }
      }
    }
  }
}

// To support more effects, we add several effect types.
export const AE_MODE_SET_JSON = 11 as any;
export const AE_MODE_APPEND_JSON = 12 as any;
const _json_cache = {} as Record<string, any>;
Hooks.on(
  "applyActiveEffect",
  function (actor: LancerActor, change: EffectChangeData, _current: any, _delta: any, _changes: any) {
    if (change.mode == AE_MODE_SET_JSON || change.mode == AE_MODE_APPEND_JSON) {
      try {
        let parsed_delta = _json_cache[change.value] ?? JSON.parse(change.value);
        _json_cache[change.value] = parsed_delta;
        // Ok, now set it to wherever it was labeled
        if (change.mode == AE_MODE_SET_JSON) {
          foundry.utils.setProperty(actor, change.key, parsed_delta);
        } else if (change.mode == AE_MODE_APPEND_JSON) {
          foundry.utils.getProperty(actor, change.key).push(parsed_delta);
        }
      } catch (e) {
        // Nothing to do really, except log it
        console.warn(e);
        console.warn(`JSON effect parse failed, ${change.value}`);
      }
    }
  }
);

declare global {
  interface DocumentClassConfig {
    ActiveEffect: typeof LancerActiveEffect;
  }
  interface FlagConfig {
    ActiveEffect: {
      lancer: {
        // If true, then this is the effect innately generated by certain categories of items, such as frames, npc classes, etc
        // or an effect generated by the bonuses on such an item
        // These are aggressively regenerated. Do not become attached to them.
        ephemeral?: boolean;

        // If specified, disable unless this
        target_type?: LancerEffectTarget;

        // When we propagate an effect, the origin becomes the parent actor.
        // This field maintains the true original
        deep_origin?: string | null;

        // If this is a status, effect, or condition - whichever of those it is
        status_type?: "status" | "effect" | "condition";
      };
    };
  }
}
