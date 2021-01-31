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
  subscriptions: LancerSubscription[] = [];

  // Kept for comparing previous to next values
  prior_max_hp = -1;

  /** @override
   * We need to both:
   *  - Re-generate all of our subscriptions
   *  - Re-initialize our MM context
   */
  prepareDerivedData() {
    // Reset subscriptions for new data
    this.setupLancerHooks();

    // Declare our derived data with a shorthand "dr" - we will be using it a lot
    let dr: this["data"]["data"]["derived"];

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
      mmec_promise: null as any, // we will set these momentarily
    };

    // Add into our wip data structure
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
          enumerable: false,
        });

        // Changes in max-hp should heal the actor. But certain requirements must be met
        // - Must know prior (would be in dr.current_hp.max). If 0, do nothing
        // - Must not be dead. If HP <= 0, do nothing
        // - New HP must be valid. If 0, do nothing
        // If above two are true, then set HP = HP - OldMaxHP + NewMaxHP. This should never drop the ent below 1 hp
        const hp_change_corrector = (curr_hp: number, old_max: number, new_max: number) => {
          if (curr_hp <= 0) return curr_hp;
          if (old_max <= 0) return curr_hp;
          if (new_max <= 0) return curr_hp;
          let new_hp = curr_hp - old_max + new_max;
          if (new_hp < 1) new_hp = 1;

          // Return so it can also be set to the MM item
          return new_hp;
        };

        // If our max hp changed, do somethin'
        let curr_hp = mmec.ent.CurrentHP;
        let corrected_hp = hp_change_corrector(curr_hp, this.prior_max_hp, mmec.ent.MaxHP);
        if (curr_hp != corrected_hp) {
          // Cancel christmas. We gotta update ourselves to reflect the new HP change >:(
          console.warn(
            "TODO: figure out a more elegant way to update hp based on max hp than calling update in prepareData. Maybe only choice."
          );
        }

        // Set the general props. ALl actors have at least these
        dr.edef = mmec.ent.EDefense;
        dr.evasion = mmec.ent.Evasion;

        dr.current_hp.value = mmec.ent.CurrentHP;
        dr.current_hp.max = mmec.ent.MaxHP;

        dr.overshield.value = mmec.ent.Overshield;
        dr.overshield.max = mmec.ent.MaxHP; // as good a number as any I guess

        // Depending on type, setup derived fields more precisely as able
        if (mmec.ent.Type != EntryType.PILOT) {
          let robot = mmec.ent as Mech | Npc | Deployable;

          // All "wow, cool robot" type units have these
          dr.save_target = robot.SaveTarget;
          dr.current_heat.max = robot.HeatCapacity;
          dr.current_heat.value = robot.CurrentHeat;

          if (robot.Type != EntryType.DEPLOYABLE) {
            // Deployables don't have stress/struct
            dr.current_structure.max = robot.MaxStructure;
            dr.current_structure.value = robot.CurrentStructure;

            dr.current_stress.max = robot.MaxStress;
            dr.current_stress.value = robot.CurrentStress;
          }
          if (robot.Type != EntryType.NPC) {
            // Npcs don't have repairs
            dr.current_repairs.max = robot.RepairCapacity;
            dr.current_repairs.value = robot.CurrentRepairs;
          }
        }

        // Update prior max hp val
        this.prior_max_hp = dr.current_hp.max;

        // Now that data is set properly, force token to draw its bars
        if (this.token) {
          (this.token as any).drawBars();
        } else {
          for (let token of this.getActiveTokens()) {
            (token as any).drawBars();
          }
        }

        return mmec;
      });

    // Also assign the promise via defineProperty, similarly to prevent enumerability
    Object.defineProperty(dr, "mmec_promise", {
      value: mmec_promise,
      configurable: true,
      enumerable: false,
    });
  }

  /** @override
   * Want to destroy derived data before passing it to an update
   */
  async update(data: any, options: any = undefined) {
    // Never submit derived data. Typically won't show up here regardless
    if (data?.derived) {
      delete data.data.derived;
    }

    return super.update(data, options);
  }

  /** @override
   * On the result of an update, we want to cascade derived data.
   */
  _onUpdate(...args: any) {
    // Upon ourselves being updated, trigger any listener hooks
    super._onUpdate(args[0], args[1], args[2], args[3]);
    LancerHooks.call(this);
  }

  // ditto cascade
  _onCreateEmbeddedEntity(...args: any) {
    //@ts-ignore Incorrect typings
    super._onCreateEmbeddedEntity(...args);
    LancerHooks.call(this);
  }

  // ditto cascade
  _onModifyEmbeddedEntity(...args: any) {
    //@ts-ignore Incorrect typings
    super._onModifyEmbeddedEntity(...args);
    LancerHooks.call(this);
  }

  // ditto cascade
  _onUpdateEmbeddedEntity(...args: any) {
    //@ts-ignore Incorrect typings
    super._onUpdateEmbeddedEntity(...args);
    LancerHooks.call(this);
  }

  // ditto cascade
  _onDeleteEmbeddedEntity(args: any) {
    super._onDeleteEmbeddedEntity(args);
    LancerHooks.call(this);
  }

  setupLancerHooks() {
    // If we're a compendium entity, don't actually do anything
    if (this.compendium) {
      return;
    }

    // Clear old subs
    this.subscriptions?.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];

    let dependency: RegRef<LancerActorType> | null = null;
    // If we are a mech, we need to subscribe to our pilot (if it exists)
    if (this.data.type == EntryType.MECH) {
      let mech_data = (this.data.data as unknown) as RegMechData;
      if (mech_data.pilot) {
        dependency = mech_data.pilot;
      }
    } else if (this.data.type == EntryType.DEPLOYABLE) {
      // If deployable, same deal
      let dep_data = (this.data.data as unknown) as RegDeployableData;
      if (dep_data.deployer) {
        dependency = dep_data.deployer;
      }
    }

    // Make a subscription for each
    if (dependency) {
      let sub = LancerHooks.on(dependency, async (_: any) => {
        console.log("Triggering subscription-based update on " + this.name);
        // We typically don't need to actually .update() ourselves when a dependency updates
        // Each client will individually prepareDerivedData in response to the update, and so there is no need for DB communication
        // Only exception is for cases like changes in max hp changing current HP - a tangible change in what data should be stored on this.
        // Said updates will be fied off in prepareData if necessary.
        this.prepareDerivedData();

        // Wait for it to be done
        await this.data.data.derived.mmec_promise;

        // Trigger a render. Sheets may need to show something different now
        this.render();

        // Also, let any listeners on us know!
        LancerHooks.call(this);
      });
      this.subscriptions.push(sub);
    }
  }
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
export type LancerActorType =
  | EntryType.MECH
  | EntryType.DEPLOYABLE
  | EntryType.NPC
  | EntryType.PILOT;
export const LancerActorTypes: LancerActorType[] = [
  EntryType.MECH,
  EntryType.DEPLOYABLE,
  EntryType.NPC,
  EntryType.PILOT,
];

export function is_actor_type(type: LancerActorType | LancerItemType): type is LancerActorType {
  return LancerActorTypes.includes(type as LancerActorType);
}
