import { LANCER } from "../config";
import {
  EntryType,
  MountType,
  funcs,
  RegEntryTypes,
  RegMechData,
  OpCtx,
  Mech,
  Pilot,
  Deployable,
  Npc,
  RegRef,
  RegDeployableData,
} from "machine-mind";
import { FoundryRegActorData, FoundryRegItemData } from "../mm-util/foundry-reg";
import { LancerHooks, LancerSubscription } from "../helpers/hooks";
import { mm_wrap_actor } from "../mm-util/helpers";
import { system_ready } from "../../lancer";
import { LancerItemType } from "../item/lancer-item";
const lp = LANCER.log_prefix;

export function lancerActorInit(data: any) {
  // Some subtype of ActorData
  console.log(`${lp} Initializing new ${data.type}`);

  // Produce our default data
  let default_data: any = {};
  let display_mode: number = CONST.TOKEN_DISPLAY_MODES.ALWAYS;
  let disposition: number = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
  switch (data.type) {
    case EntryType.NPC:
      default_data = funcs.defaults.NPC();
      disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE;
      break;
    case EntryType.PILOT:
      default_data = funcs.defaults.PILOT();
      break;
    case EntryType.DEPLOYABLE:
      default_data = funcs.defaults.DEPLOYABLE();
      display_mode = CONST.TOKEN_DISPLAY_MODES.HOVER;
      disposition = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
      break;
    case EntryType.MECH:
    default:
      // Idk, just in case
      default_data = funcs.defaults.MECH();
      break;
  }

  // Put in the basics
  mergeObject(data, {
    data: default_data,
    img: `systems/lancer/assets/icons/${data.type}.svg`,
    "token.bar1": { attribute: "derived.current_hp" }, // Default Bar 1 to HP
    "token.bar2": { attribute: "derived.current_heat" }, // Default Bar 2 to Heat
    "token.displayName": display_mode,
    "token.displayBars": display_mode,
    "token.disposition": disposition,
    name: data.name ?? default_data.name, // Set name to match internal
    "token.name": data.name ?? default_data.name, // Set token name to match internal
    "token.actorLink": [EntryType.PILOT, EntryType.MECH].includes(data.type), // Link the token to the Actor for pilots and mechs, but not for NPCs or deployables
  });

  console.log(data);
}

// Use for HP, etc
interface BoundedValue {
  min: number;
  max: number;
  value: number;
}

/**
 * Extend the Actor class for Lancer Actors.
 */
export class LancerActor<T extends LancerActorType> extends Actor {
  data!: FoundryRegActorData<T> & {
    data: {
      // Include additional derived info
      derived: {
        // These are all derived and populated by MM
        current_hp: BoundedValue;
        current_heat: BoundedValue;
        current_stress: BoundedValue;
        current_structure: BoundedValue;
        current_repairs: BoundedValue;
        overshield: BoundedValue; // Though not truly a bounded value, useful to have it as such for bars etc

        // Other values we particularly appreciate having cached
        evasion: number;
        edef: number;
        save_target: number;
        // todo - bonuses and stuff. How to allow for accuracy?
      };
    };
  };

  /* -------------------------------------------- */
  // Tracks data propagation
  subscriptions = new Array<LancerSubscription>();

  // Kept for comparing previous to next values
  prior_derived: this["data"]["data"]["derived"] | null = null;

  /** @override
   * We need to both:
   *  - Re-generate all of our subscriptions
   *  - Re-initialize our MM context
   */
  prepareDerivedData() {
    this.subscriptions?.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];
    this.setupLancerHooks();

    // That done/guaranteed make a shorthand
    let dr: this["data"]["data"]["derived"];
    if (!this.prior_derived) {
      // Default in fields
      let default_bounded = () => ({
        min: 0,
        max: 0,
        value: 0,
      });

      // Prepare our derived stat data by first initializing an empty obj
      dr = {
        edef: 0,
        evasion: 0,
        save_target: 0,
        current_heat: default_bounded(),
        current_hp: default_bounded(),
        overshield: default_bounded(),
        current_structure: default_bounded(),
        current_stress: default_bounded(),
        current_repairs: default_bounded(),
        mmec: null as any, // we will set these momentarily
        mmec_promise: null as any // we will set these momentarily
      }

      // We set it normally. Was tempted to use defineProperty to prevent it being duplicated, but we just do that in update
      this.prior_derived = dr;
    } else {
      // Reuse the old one
      dr = this.prior_derived;
    }

    // Re-set into our wip data structure
    this.data.data.derived = dr;

    // Begin the task of wrapping our actor. When done, it will setup our derived fields - namely, our max values
    // Need to wait for system ready to avoid having this break if prepareData called during init step (spoiler alert - it is)
    let mmec_promise = system_ready
      .then(() => mm_wrap_actor(this))
      .then(mmec => {
        // Always save the context
        // Save the context via defineProperty so it does not show up in JSON stringifies. Also, no point in having it writeable
        Object.defineProperty(dr, "mmec", {
          value: mmec,
          configurable: true,
          enumerable: false
        });

        // Changes in max-hp should heal the actor. But certain requirements must be met
        // - Must know prior (would be in dr.current_hp.max). If 0, do nothing
        // - Must not be dead. If HP <= 0, do nothing
        // - New HP must be valid. If 0, do nothing
        // If above two are true, then set HP = HP - OldMaxHP + NewMaxHP. This should never drop the ent below 1 hp
        const hp_change_corrector = (curr_hp: number, old_max: number, new_max: number) => {
          console.log(`HP CHANGE CALC ${this.name} ${curr_hp} ${old_max} ${new_max}`);
          if(curr_hp <= 0) return curr_hp;
          if(old_max <= 0) return curr_hp;
          if(new_max <= 0) return curr_hp;
          let new_hp = curr_hp - old_max + new_max;
          if(new_hp < 1) new_hp = 1;
          console.log(`HP CHANGE SUCCEEDED ${new_hp}`);
          return new_hp;
        }


        // Depending on type, setup derived fields more precisely as able
        if (mmec.ent.Type == EntryType.MECH) {
          let mech = mmec.ent as Mech;

          // Correct hp based on change in max
          mech.CurrentHP = hp_change_corrector(mech.CurrentHP, dr.current_hp.max, mech.MaxHP);

          dr.edef = mech.EDefense;
          dr.evasion = mech.Evasion;
          dr.save_target = mech.SaveTarget;

          dr.current_heat.max = mech.HeatCapacity;
          dr.current_heat.value = mech.CurrentHeat;

          dr.current_hp.max = mech.MaxHP;
          dr.current_hp.value = mech.CurrentHP;

          dr.overshield.max = mech.MaxHP; // As good a number as any i guess.
          dr.overshield.value = mech.Overshield;

          dr.current_structure.max = mech.MaxStructure;
          dr.current_structure.value = mech.CurrentStructure;

          dr.current_stress.max = mech.MaxStress;
          dr.current_stress.value = mech.CurrentStress;

          dr.current_repairs.max = mech.RepairCapacity;
          dr.current_repairs.value = mech.CurrentRepairs;
        } else if (mmec.ent.Type == EntryType.PILOT) {
          // Pilots only really have base stats + hp + overshield
          let pilot = mmec.ent as Pilot;

          // Correct hp based on change in max
          pilot.CurrentHP = hp_change_corrector(pilot.CurrentHP, dr.current_hp.max, pilot.MaxHP);

          dr.edef = pilot.EDefense;
          dr.evasion = pilot.Evasion;

          dr.current_hp.max = pilot.MaxHP;
          dr.current_hp.value = pilot.CurrentHP;

          dr.overshield.max = pilot.MaxHP; // As good a number as any i guess.
          dr.overshield.value = pilot.Overshield;
        } else if (mmec.ent.Type == EntryType.DEPLOYABLE) {
          let dep = mmec.ent as Deployable;

          // Correct hp based on change in max
          dep.CurrentHP = hp_change_corrector(dep.CurrentHP, dr.current_hp.max, dep.MaxHP);

          dr.edef = dep.EDefense;
          dr.evasion = dep.Evasion;
          dr.save_target = dep.Save;

          dr.current_hp.value = dep.CurrentHP;
          dr.current_hp.max = dep.MaxHP;

          dr.overshield.value = dep.Overshield;
          dr.overshield.max = dep.MaxHP;

          dr.current_heat.value = dep.CurrentHeat;
          dr.current_heat.max = dep.HeatCapacity;
          // we ignore stress and structure for now, as I don't think they really make any sense
        } else if (mmec.ent.Type == EntryType.NPC) {
          let npc = mmec.ent as Npc;

          // Correct hp based on change in max
          npc.CurrentHP = hp_change_corrector(npc.CurrentHP, dr.current_hp.max, npc.MaxHP);

          dr.edef = npc.EDefense;
          dr.evasion = npc.Evasion;
          dr.save_target = npc.SaveTarget;

          dr.current_heat.max = npc.HeatCapacity;
          dr.current_heat.value = npc.CurrentHeat;

          dr.current_hp.max = npc.MaxHP;
          dr.current_hp.value = npc.CurrentHP;

          dr.overshield.max = npc.MaxHP; 
          dr.overshield.value = npc.Overshield;

          dr.current_structure.max = npc.MaxStructure;
          dr.current_structure.value = npc.CurrentStructure;

          dr.current_stress.max = npc.MaxStress;
          dr.current_stress.value = npc.CurrentStress;
        }

        // Now that data is set properly, force token to draw its bars
        if(this.token) {
          (this.token as any).drawBars();
        } else {
          for(let token of this.getActiveTokens()) {
            (token as any).drawBars();
          }
        }

        return mmec;
      });

    // Also assign the promise via defineProperty, similarly to prevent enumerability
    Object.defineProperty(dr, "mmec_promise", {
      value: mmec_promise,
      configurable: true,
      enumerable: false
    });
  }

  /** @override 
   * Want to destroy derived data before passing it to an update
  */
  async update(data: any, options={}) {
    if(data?.data?.derived) {
      delete data.data.derived;
    }
    return super.update(data, options);
  }


  /** @override */
  _onUpdate(data: object, options: object, userId: string, context: object) {
    super._onUpdate(data, options, userId, context);
    LancerHooks.call(this);
  }

  setupLancerHooks() {
    let depends: RegRef<LancerActorType>[] = [];
    // If we are a mech, we need to subscribe to our pilot (if it exists)
    if(this.data.type == EntryType.MECH) {
      let mech_data = (this.data.data as unknown) as RegMechData; 
      if (mech_data.pilot) {
        depends.push(mech_data.pilot)
      }
    } else if(this.data.type == EntryType.DEPLOYABLE) { 
      // If deployable, same deal
      let dep_data = (this.data.data as unknown) as RegDeployableData; 
      if (dep_data.deployer) {
        depends.push(dep_data.deployer)
      }
    }

    // Make a subscription for each
    for(let depend of depends) {
        let sub = LancerHooks.on(
          depend,
          (async (_: any) => {
            console.log("Triggering subscription-based update");
            this.update(this.data);
            // this.prepareDerivedData();
            // this.data.data.derived.mmec_promise.then(() => this.render());
          }).bind(this)
        );
        this.subscriptions.push(sub);
    }
  }

  // If we are a deployable, we need to subscribe to our deployer
}

// Discrete types for all of our possible generic values
export type LancerMech = LancerActor<EntryType.MECH>;
export type LancerMechData = FoundryRegActorData<EntryType.MECH>;
export type LancerNpc = LancerActor<EntryType.NPC>;
export type LancerNpcData = FoundryRegActorData<EntryType.NPC>;
export type LancerPilot = LancerActor<EntryType.PILOT>;
export type LancerPilotData = FoundryRegActorData<EntryType.PILOT>;
export type LancerDeployable = LancerActor<EntryType.DEPLOYABLE>;
export type LancerDeployableData = FoundryRegActorData<EntryType.DEPLOYABLE>;

export type AnyLancerActor = LancerActor<LancerActorType>;
export type LancerActorType = EntryType.MECH | EntryType.DEPLOYABLE | EntryType.NPC | EntryType.PILOT;
export const LancerActorTypes: LancerActorType[] = [EntryType.MECH, EntryType.DEPLOYABLE, EntryType.NPC, EntryType.PILOT];

export function is_actor_type(type: LancerActorType | LancerItemType): type is LancerActorType {
  return LancerActorTypes.includes(type as LancerActorType);
}