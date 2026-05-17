import type { LancerActor } from "../actor/lancer-actor";
import { NpcFeatureType } from "../enums";
import type { DamageData } from "../models/bits/damage";
import type { UUIDRef } from "../source-template";
import { renderTemplateStep } from "./_render";
import { Flow, type FlowState } from "./flow";
import type { LancerFlowState } from "./interfaces";

export function registerScanSteps(flowSteps: Map<string, any>) {
  flowSteps.set("initScanData", initScanData);
  flowSteps.set("createScanJournal", createScanJournal);
  flowSteps.set("printScanCard", printScanCard);
}

export class ScanFlow extends Flow<LancerFlowState.ScanData> {
  static steps = ["initScanData", "createScanJournal", "printScanCard"];

  constructor(uuid: UUIDRef | LancerActor, data?: Partial<LancerFlowState.ScanData>) {
    const initialData: LancerFlowState.ScanData = {
      target: data?.target || null,
      name: data?.target?.name || "Enemy Unknown",
    };

    super(uuid, initialData);
  }
}

async function initScanData(state: FlowState<LancerFlowState.ScanData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Flowstate missing!`);
  console.log("scan flow data:", state.data);
  if (!state.data.target) throw new TypeError(`Scan flow requires a target.`);
  const actor = state.data.target.actor;
  if (!actor) throw new TypeError(`Scan flow target does not reference an actor!`);
  state.data.name = state.data.target.name;
  const tierIndex = (actor.system.tier || 1) - 1;
  state.data.stats = {
    hull: actor.system.hull,
    agi: actor.system.agi,
    sys: actor.system.sys,
    eng: actor.system.eng,
    hp: actor.system.hp.max,
    // TODO: conditional based on scan type - spotter, athena
    // hpValue: actor.system.hp.value,
    heat: actor.system.heat?.max,
    structure: actor.system.structure?.max,
    stress: actor.system.stress?.max,
    armor: actor.system.armor,
    evasion: actor.system.evasion,
    edef: actor.system.edef,
    speed: actor.system.speed,
    size: actor.system.size,
    save: actor.system.save,
    sensor_range: actor.system.sensor_range,
  };
  // TODO: don't add weapons & systems to data for spotter scans
  state.data.weapons = actor.items
    .filter(i => i.is_npc_feature() && i.system.type === NpcFeatureType.Weapon)
    .map(item => {
      const tierDamage = item.system.damage && item.system.damage[tierIndex];
      let damages: DamageData[] = [];
      if (tierDamage) {
        if (Array.isArray(tierDamage)) {
          damages = damages.concat(tierDamage.map(d => ({ type: d.type, val: d.val })));
        } else {
          damages.push(tierDamage && { type: tierDamage.type, val: tierDamage.val });
        }
      }
      return {
        name: item.name,
        weapon_type: item.system.weapon_type || "Unknown",
        attack_bonus: item.system.attack_bonus && item.system.attack_bonus[tierIndex],
        accuracy: item.system.accuracy && item.system.accuracy[tierIndex],
        range: item.system.range?.map(r => ({ type: r.type, val: r.val })).filter(r => Boolean(r)) || [],
        damage: damages.length ? damages : undefined,
        effect: item.system.effect,
        on_hit: item.system.on_hit,
        tags: item.system.tags,
      };
    });

  // state.data.systems = actor.items...
  return true;
}

async function createScanJournal(state: FlowState<LancerFlowState.ScanData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Flowstate missing!`);
  return true;
}

async function printScanCard(state: FlowState<LancerFlowState.ScanData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Flowstate missing!`);
  const template = `systems/${game.system.id}/templates/chat/scan-card.hbs`;
  // TODO: strip out data for irrelevant tiers
  await renderTemplateStep(state.actor, template, state.data);
  return true;
}
