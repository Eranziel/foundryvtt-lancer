import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { LANCER, friendly_entrytype_name } from "../config";
import { EntryType, NpcFeatureType } from "../enums";
import { SourceData } from "../source-template";
import { Flow, FlowState, Step } from "./flow";
import { LancerFlowState } from "./interfaces";

export function registerItemUtilSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("checkItemDestroyed", checkItemDestroyed);
  flowSteps.set("checkItemLimited", checkItemLimited);
  flowSteps.set("checkItemCharged", checkItemCharged);
  flowSteps.set("applySelfHeat", applySelfHeat);
  flowSteps.set("updateItemAfterAction", updateItemAfterAction);
}

export async function checkItemDestroyed(
  state: FlowState<LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData | LancerFlowState.ActionUseData>
): Promise<boolean> {
  // If this automation option is not enabled, skip the check.
  const { limited_loading, attacks } = game.settings.get(game.system.id, LANCER.setting_automation);
  if (!limited_loading && attacks) return true;
  if (!state.item) return true; // This flow is actor-based, so there is no item to be destroyed.
  if (
    state.item.is_frame() ||
    state.item.is_pilot_weapon() ||
    state.item.is_pilot_gear() ||
    state.item.is_pilot_armor() ||
    state.item.is_talent()
  ) {
    return true; // These items can't be destroyed
  }
  if (
    !state.item.is_mech_weapon() &&
    !state.item.is_mech_system() &&
    !state.item.is_weapon_mod() &&
    !state.item.is_npc_feature()
  ) {
    return false;
  }
  if (state.item.system.destroyed) {
    if (
      state.item.is_mech_system() ||
      (state.item.is_npc_feature() && state.item.system.type !== NpcFeatureType.Weapon)
    ) {
      ui.notifications!.warn(`System ${state.item.name} has no remaining uses!`);
    } else {
      ui.notifications!.warn(`Weapon ${state.item.name} has no remaining uses!`);
    }
    return false;
  }
  return true;
}

export async function checkItemLimited(
  state: FlowState<LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData | LancerFlowState.ActionUseData>
): Promise<boolean> {
  // If this automation option is not enabled, skip the check.
  const { limited_loading, attacks } = game.settings.get(game.system.id, LANCER.setting_automation);
  if (!limited_loading && attacks) return true;
  if (!state.item) return true; // This flow is actor-based, so there is no item to be destroyed.
  if (state.item.is_talent()) {
    return true; // These items don't support limited uses
  }
  if (
    !state.item.is_mech_weapon() &&
    !state.item.is_mech_system() &&
    !state.item.is_frame() &&
    !state.item.is_weapon_mod() &&
    !state.item.is_pilot_weapon() &&
    !state.item.is_pilot_gear() &&
    !state.item.is_pilot_armor() &&
    !state.item.is_npc_feature()
  ) {
    return false;
  }
  if (state.item.is_frame()) {
    // Frames are special, we need to check for limited on the core system.
    if ((state.item.system.core_system.tags ?? []).some(t => t.is_loading)) {
      // No frames use tags, so none of them track liimited uses.
      return true;
    }
    // The frame is not limited, so we're good.
    return true;
  }
  if (state.item.isLimited() && state.item.system.uses.value <= 0) {
    let iType = friendly_entrytype_name(state.item.type as EntryType);
    ui.notifications!.warn(`${iType} ${state.item.name} has no remaining uses!`);
    return false;
  }
  return true;
}

export async function checkItemCharged(
  state: FlowState<LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData | LancerFlowState.ActionUseData>
): Promise<boolean> {
  // If this automation option is not enabled, skip the check.
  const { limited_loading, attacks } = game.settings.get(game.system.id, LANCER.setting_automation);
  if (!limited_loading && attacks) return true;
  if (!state.item) return true; // This flow is actor-based, so there is no item to be destroyed.
  if (!state.item.is_npc_feature()) return true; // Recharge only applies to NPC features

  if (state.item.isRecharge() && !state.item.system.charged) {
    if (state.item.system.type !== NpcFeatureType.Weapon) {
      ui.notifications!.warn(`System ${state.item.name} has not recharged!`);
    } else {
      ui.notifications!.warn(`Weapon ${state.item.name} has not recharged!`);
    }
    return false;
  }
  return true;
}

export async function applySelfHeat(
  state: FlowState<
    | LancerFlowState.AttackRollData
    | LancerFlowState.WeaponRollData
    | LancerFlowState.TechAttackRollData
    | LancerFlowState.ActionUseData
    | LancerFlowState.SystemUseData
  >,
  options?: {}
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Flow state missing!`);
  let self_heat = 0;

  if (state.data.self_heat) {
    const roll = await new Roll(state.data.self_heat).evaluate();
    self_heat = roll.total!;
    state.data.self_heat_result = {
      roll,
      tt: await roll.getTooltip(),
    };
  }

  if (game.settings.get(game.system.id, LANCER.setting_automation).attack_self_heat) {
    if (state.actor.is_mech() || state.actor.is_npc()) {
      // TODO: overkill heat to move to damage flow
      await state.actor.update({
        // @ts-expect-error Missing overkill_heat
        "system.heat.value": state.actor.system.heat.value + (state.data.overkill_heat ?? 0) + self_heat,
      });
    }
  }

  return true;
}

export async function updateItemAfterAction(
  state: FlowState<
    | LancerFlowState.WeaponRollData
    | LancerFlowState.TechAttackRollData
    | LancerFlowState.ActionUseData
    | LancerFlowState.SystemUseData
  >,
  options?: {}
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Flow state missing!`);
  const { limited_loading, attacks } = game.settings.get(game.system.id, LANCER.setting_automation);
  if (state.item && limited_loading && attacks) {
    let item_changes: DeepPartial<SourceData.MechWeapon | SourceData.NpcFeature | SourceData.PilotWeapon> = {};
    if (state.item.isLoading()) item_changes.loaded = false;
    if (state.item.isLimited()) item_changes.uses = { value: Math.max(state.item.system.uses.value - 1, 0) };
    if (state.item.is_npc_feature() && state.item.isRecharge())
      (item_changes as DeepPartial<SourceData.NpcFeature>).charged = false;
    if (Object.keys(item_changes).length === 0) return true;
    await state.item.update({ system: item_changes });
  }
  return true;
}
