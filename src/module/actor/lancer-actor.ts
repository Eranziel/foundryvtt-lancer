import { LANCER, TypeIcon } from "../config";
import {
  EntryType,
  funcs,
  RegMechData,
  Mech,
  Deployable,
  Npc,
  RegRef,
  RegDeployableData,
  OpCtx,
  LiveEntryTypes,
  RegEnv,
  StaticReg,
} from "machine-mind";
import { FoundryRegActorData, FoundryRegItemData } from "../mm-util/foundry-reg";
import { LancerHooks, LancerSubscription } from "../helpers/hooks";
import { mm_wrap_actor } from "../mm-util/helpers";
import { system_ready } from "../../lancer";
import { LancerItemType } from "../item/lancer-item";
import { renderMacroTemplate } from "../macros";
const lp = LANCER.log_prefix;

export function lancerActorInit(data: any) {
  // Some subtype of ActorData
  console.log(`${lp} Initializing new ${data.type}`);
  // If it has an ID it's a duplicate, so we don't want to override values
  if (!data._id) {
    // Produce our default data
    let default_data: any = {};
    let display_mode: number = CONST.TOKEN_DISPLAY_MODES.ALWAYS;
    let disposition: number = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
    switch (data.type) {
      case EntryType.NPC:
        default_data = funcs.defaults.NPC();
        display_mode = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;
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
      img: TypeIcon(data.type),
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
    // TODO: update to match template
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

  // Kept separately so it can be used by items. Same as in our .data.data.derived.mmec_promise
  _actor_ctx!: OpCtx;

  /**
   * Performs overheat on the mech
   * For now, just rolls on table. Eventually we can include configuration to do automation
   */
  // TODO: migrate to mech
  /*
  async overheatMech() {
    // Assert that we aren't on a deployable somehow
    if (this.isDep(this.data)) {
      return;
    }

    // Table of descriptions
    function stressTableD(roll: number, remStress: number) {
      switch (roll) {
        // Used for multiple ones
        case 0:
          return "The reactor goes critical – your mech suffers a reactor meltdown at the end of your next turn.";
        case 1:
          switch (remStress) {
            case 2:
              // Choosing not to auto-roll the checks to keep the suspense up
              return "Roll an ENGINEERING check. On a success, your mech is EXPOSED; on a failure, it suffers a reactor meltdown after 1d6 of your turns (rolled by the GM). A reactor meltdown can be prevented by retrying the ENGINEERING check as a full action.";
            case 1:
              return "Your mech suffers a reactor meltdown at the end of your next turn.";
            default:
              return "Your mech becomes Exposed.";
          }
        case 2:
        case 3:
        case 4:
          return "The power plant becomes unstable, beginning to eject jets of plasma. Your mech becomes EXPOSED, taking double kinetic, explosive and electric damage until the status is cleared.";
        case 5:
        case 6:
          return "Your mech’s cooling systems manage to contain the increasing heat; however, your mech becomes IMPAIRED until the end of your next turn.";
      }
    }

    // Table of titles
    let stressTableT = [
      "Irreversible Meltdown",
      "Meltdown",
      "Destabilized Power Plant",
      "Destabilized Power Plant",
      "Destabilized Power Plant",
      "Emergency Shunt",
      "Emergency Shunt",
    ];

    const mech = this.data.data.mech;
    if (
      game.settings.get(LANCER.sys_name, LANCER.setting_automation) &&
      game.settings.get(LANCER.sys_name, LANCER.setting_auto_structure)
    ) {
      if (mech.heat.value > mech.heat.max) {
        // https://discord.com/channels/426286410496999425/760966283545673730/789297842228297748
        mech.heat.value -= (mech.heat.max);
        mech.stress.value -= 1;
      }
    }
    if (mech.stress.value === mech.stress.max) {
      ui.notifications.info("The mech is at full Stress, no overheating check to roll.");
      return;
    }
    await this.update(this.data);
    let remStress = mech.stress.value;
    let templateData = {};

    // If we're already at 0 just kill em
    if (remStress > 0) {
      let damage = mech.stress.max - mech.stress.value;

      let roll = new Roll(`${damage}d6kl1`).roll();
      let result = roll.total;

      let tt = await roll.getTooltip();
      let title = stressTableT[result];
      let text = stressTableD(result, remStress);
      let total = roll.total.toString();

      // Critical
      // This is fine
      //@ts-ignore
      let one_count = roll.terms[0].results.reduce((a, v) => {
        return v.result === 1 ? a + 1 : a;
      }, 0);
      if (one_count > 1) {
        text = stressTableD(result, 1);
        title = stressTableT[0];
        total = "Multiple Ones";
      }
      templateData = {
        val: mech.stress.value,
        max: mech.stress.max,
        tt: tt,
        title: title,
        total: total,
        text: text,
        roll: roll,
      };
    } else {
      // You ded
      let title = stressTableT[0];
      let text = stressTableD(0, 0);
      templateData = {
        val: mech.stress.value,
        max: mech.stress.max,
        title: title,
        text: text,
      };
    }
    const template = `systems/lancer/templates/chat/overheat-card.html`;
    const actor: Actor = game.actors.get(ChatMessage.getSpeaker().actor);
    return renderMacro(actor, template, templateData);
  }
   */

  // TODO: migrate to mech
  /**
   * Performs structure on the mech
   * For now, just rolls on table. Eventually we can include configuration to do automation
   */
  /*
  async structureMech() {
    // Assert that we aren't on a deployable somehow
    if (this.isDep(this.data)) {
      return;
    }

    // Table of descriptions
    function structTableD(roll: number, remStruct: number) {
      switch (roll) {
        // Used for multiple ones
        case 0:
          return "Your mech is damaged beyond repair – it is destroyed. You may still exit it as normal.";
        case 1:
          switch (remStruct) {
            case 2:
              // Choosing not to auto-roll the checks to keep the suspense up
              return "Roll a HULL check. On a success, your mech is STUNNED until the end of your next turn. On a failure, your mech is destroyed.";
            case 1:
              return "Your mech is destroyed.";
            default:
              return "Your mech is STUNNED until the end of your next turn.";
          }
        case 2:
        case 3:
        case 4:
          // Idk, should this auto-roll?
          return "Parts of your mech are torn off by the damage. Roll 1d6. On a 1–3, all weapons on one mount of your choice are destroyed; on a 4–6, a system of your choice is destroyed. LIMITED systems and weapons that are out of charges are not valid choices. If there are no valid choices remaining, it becomes the other result. If there are no valid systems or weapons remaining, this result becomes a DIRECT HIT instead.";
        case 5:
        case 6:
          return "Emergency systems kick in and stabilize your mech, but it’s IMPAIRED until the end of your next turn.";
      }
    }

    // Table of titles
    let structTableT = [
      "Crushing Hit",
      "Direct Hit",
      "System Trauma",
      "System Trauma",
      "System Trauma",
      "Glancing Blow",
      "Glancing Blow",
    ];

    const mech = this.data.data.mech;
    if (
      game.settings.get(LANCER.sys_name, LANCER.setting_automation) &&
      game.settings.get(LANCER.sys_name, LANCER.setting_auto_structure)
    ) {
      if (mech.hp.value <= 0) {
        mech.hp.value += mech.hp.max;
        mech.structure.value -= 1;
      }
    }
    if (mech.structure.value === mech.structure.max) {
      ui.notifications.info("The mech is at full Structure, no structure check to roll.");
      return;
    }
    await this.update(this.data);
    let remStruct = mech.structure.value;
    let templateData = {};
    // If we're already at 0 just kill em
    if (remStruct > 0) {
      let damage = mech.structure.max - mech.structure.value;

      let roll = new Roll(`${damage}d6kl1`).roll();
      let result = roll.total;

      let tt = await roll.getTooltip();
      let title = structTableT[result];
      let text = structTableD(result, remStruct);
      let total = roll.total.toString();

      // Crushing hits
      // This is fine
      //@ts-ignore
      let one_count = roll.terms[0].results.reduce((a, v) => {
        return v.result === 1 ? a + 1 : a;
      }, 0);
      if (one_count > 1) {
        text = structTableD(result, 1);
        title = structTableT[0];
        total = "Multiple Ones";
      }
      templateData = {
        val: mech.structure.value,
        max: mech.structure.max,
        tt: tt,
        title: title,
        total: total,
        text: text,
        roll: roll,
      };
    } else {
      // You ded
      let title = structTableT[0];
      let text = structTableD(0, 0);
      templateData = {
        val: mech.structure.value,
        max: mech.structure.max,
        title: title,
        text: text,
      };
    }
    const template = `systems/lancer/templates/chat/structure-card.html`;
    const actor: Actor = game.actors.get(ChatMessage.getSpeaker().actor);
    return renderMacro(actor, template, templateData);
  }
  */

  /* -------------------------------------------- */

  /** @override
   * We want to reset our ctx before this. It is used by our items, such that they all can share
   * the same ctx space.
   */
  prepareEmbeddedEntities() {
    this._actor_ctx = new OpCtx();
    super.prepareEmbeddedEntities();
  }

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
    .then(() => mm_wrap_actor(this, this._actor_ctx))
    .catch(async (e) => {
      // This is 90% of the time a token not being able to resolve itself due to canvas not loading yet
      console.warn("Token unable to prepare - hopefully trying again when canvas ready. In meantime, using dummy");
      console.warn(e);

      // Make a dummy value
      let ctx = new OpCtx();
      let env = new RegEnv();
      let reg = new StaticReg(env);
      let ent = await reg.get_cat(this.data.type).create_default(ctx);
      return {
        reg,
        ent,
        ctx
      };
    })
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
      if (this.isToken && (this.token as any).bars) {
        // Just redraw self
        try {
          (this.token as any).drawBars();
        } catch (e) {}
      } else {
        // Redraw all active tokens
        for (let token of this.getActiveTokens()) {
          if ((token as any).bars) {
            try {
              (token as any).drawBars();
            } catch (e) {}
          }
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
    //@ts-ignore Incorrect typings
    super._onUpdate(...args);
    LancerHooks.call(this);
  }

  // Ditto - items alter stats quite often
  _onModifyEmbeddedEntity(...args: any) {
    //@ts-ignore Incorrect typings
    super._onModifyEmbeddedEntity(...args);
    LancerHooks.call(this);
  }

  _onDelete(...args: any) {
    //@ts-ignore Incorrect typings
    super._onDelete(...args);

    this.subscriptions?.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];
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
        this._actor_ctx = new OpCtx();
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

  /**
   * Returns the current overcharge roll/text
   * Only applicable for pilots
   * Overkill for now but there are situations where we'll want this to be configurable
   */
  getOverchargeRoll(): string | null {
    // Function is only applicable to pilots.
    if (this.data.type !== EntryType.MECH) return null;

    const data = this.data as LancerMechData;

    switch (data.data.current_overcharge) {
      case 1:
        return "1d3";
      case 2:
        return "1d6";
      case 3:
        return "1d6+4";
      default:
        return "1";
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
export type AnyMMActor = LiveEntryTypes<LancerActorType>;
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
