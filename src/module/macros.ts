// Import TypeScript modules
import { LANCER } from "./config";
import {
  AnyLancerItem,
  LancerCoreBonus,
  LancerItem,
  LancerMechWeaponData,
  LancerNpcFeature,
  LancerPilotGear,
  LancerPilotWeaponData,
  LancerSkill,
} from "./item/lancer-item";
import { LancerActor, LancerActorType, LancerPilot, AnyMMActor } from './actor/lancer-actor';
import {
  LancerActionMacroData,
  LancerAttackMacroData,
  LancerGenericMacroData,
  LancerMacroData,
  LancerOverchargeMacroData,
  LancerReactionMacroData,
  LancerStatMacroData,
  LancerTalentMacroData,
  LancerTechMacroData,
  LancerTextMacroData,
} from "./interfaces";
// Import JSON data
import {
  DamageType,
  EntryType,
  NpcFeatureType,
  TagInstance,
  Pilot,
  PilotWeapon,
  MechWeapon,
  RegDamageData,
  MechWeaponProfile,
  NpcFeature,
  OpCtx,
  PackedDamageData,
  Damage,
  RegNpcTechData,
  MechSystem,
  Mech,
  ActivationType,
  funcs,
} from "machine-mind";
import { FoundryFlagData, FoundryReg, FoundryRegItemData } from "./mm-util/foundry-reg";
import { is_ref, resolve_dotpath } from "./helpers/commons";
import { buildActionHTML, buildDeployableHTML, buildSystemHTML } from "./helpers/item";
import { ActivationOptions, StabOptions1, StabOptions2 } from "./enums";
import { applyCollapseListeners, uuid4 } from "./helpers/collapse";
import { checkForHit, getTargets } from "./helpers/automation/targeting";
import { AccDiffFlag, tagsToFlags, toggleCover, updateTotals } from "./helpers/acc_diff";
import { is_overkill } from "machine-mind/dist/funcs";

const lp = LANCER.log_prefix;

export function encodeMacroData(macroData: LancerMacroData): string {
  return btoa(encodeURI(JSON.stringify(macroData)));
}

export async function runEncodedMacro(el: JQuery<HTMLElement>) {
  let encoded = el.attr("data-macro");

  if (!encoded) throw Error("No macro data available");
  let data: LancerMacroData = JSON.parse(decodeURI(atob(encoded)));

  let command = data.command;

  // Some might say eval is bad, but it's no worse than what we can already do with macros
  eval(command);
}

export async function onHotbarDrop(_bar: any, data: any, slot: number) {
  // We set an associated command & title based off the type
  // Everything else gets handled elsewhere

  let command = "";
  let title = "";
  let img = "systems/lancer/assets/icons/macro-icons/d20-framed.svg";

  // Grab new encoded data ASAP
  if (data.command && data.title) {
    (command = data.command),
      (img = data.iconPath ? data.iconPath : `systems/lancer/assets/icons/macro-icons/generic_item.svg`);
    title = data.title;
  } else if (data.pack) {
    // If we have a source pack, it's dropped from a compendium and there's no processing for us to do
    return;
  } else {
    let itemId = "error";

    console.log(`${lp} Data dropped on hotbar:`, data);

    // Determine if we're using old or new method
    let actorId: string;
    if ("actorId" in data) {
      title = data.title;
      itemId = data.itemId;
      actorId = data.actorId;
    } else if(is_ref(data)) {
      var item = await new FoundryReg().resolve(new OpCtx(), data);
      title = item.Name;

      if (!item) return;

      let orig_doc = (item.Flags as FoundryFlagData).orig_doc;
      // @ts-ignore 0.8
      actorId = orig_doc.actor?.id ?? "error";
      itemId = data.id;
    } else {
      return;
    }

    switch (data.type) {
      case EntryType.SKILL:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
        img = `systems/lancer/assets/icons/macro-icons/skill.svg`;
        break;
      case EntryType.TALENT:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}", {rank: ${data.rank}});`;
        img = `systems/lancer/assets/icons/macro-icons/talent.svg`;
        break;
      case EntryType.CORE_BONUS:
        img = `systems/lancer/assets/icons/macro-icons/corebonus.svg`;
        break;
      case EntryType.PILOT_GEAR:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
        img = `systems/lancer/assets/icons/macro-icons/generic_item.svg`;
        break;
      case EntryType.PILOT_WEAPON:
      case EntryType.MECH_WEAPON:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
        img = `systems/lancer/assets/icons/macro-icons/mech_weapon.svg`;
        break;
      case EntryType.MECH_SYSTEM:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
        img = `systems/lancer/assets/icons/macro-icons/mech_system.svg`;
        break;
      case ActivationOptions.ACTION:
        // This should be fully migrated to encoded
        throw Error("This should be migrated");
        command = `game.lancer.prepareActivationMacro("${actorId}", "${itemId}", "${ActivationOptions.ACTION}", "${data.number}");`;
        img = `systems/lancer/assets/icons/macro-icons/mech_system.svg`;
        break;
      case EntryType.NPC_FEATURE:
        switch (item.FeatureType) {
          case NpcFeatureType.Reaction:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/lancer/assets/icons/macro-icons/reaction.svg`;
            break;
          case NpcFeatureType.System:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/lancer/assets/icons/macro-icons/mech_system.svg`;
            break;
          case NpcFeatureType.Trait:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/lancer/assets/icons/macro-icons/trait.svg`;
            break;
          case NpcFeatureType.Tech:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/lancer/assets/icons/macro-icons/tech_quick.svg`;
            break;
          case NpcFeatureType.Weapon:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/lancer/assets/icons/macro-icons/mech_weapon.svg`;
            break;
        }
        break;
      case "HASE":
        // This should be fully migrated to encoded
        throw Error("This should be migrated");
        command = `game.lancer.prepareStatMacro("${actorId}", "${data.dataPath}");`;
    }

    // TODO: Figure out if I am really going down this route and, if so, switch to a switch
    if (data.type === "actor") {
      title = data.title;
    } else if (data.type === "pilot_weapon") {
      // Talent are the only ones (I think??) that we need to name specially
      if (data.type === EntryType.TALENT) {
        img = `systems/lancer/assets/icons/macro-icons/talent.svg`;
      }
      // Pick the image for the hotbar
    } else if (data.type === "Text") {
      command = `game.lancer.prepareTextMacro("${data.actorId}", "${data.title}", {rank: ${data.description}})`;
    } else if (data.type === "Core-Active") {
      command = `game.lancer.prepareCoreActiveMacro("${data.actorId}")`;
      img = `systems/lancer/assets/icons/macro-icons/corebonus.svg`;
    } else if (data.type === "Core-Passive") {
      command = `game.lancer.prepareCorePassiveMacro("${data.actorId}")`;
      img = `systems/lancer/assets/icons/macro-icons/corebonus.svg`;
    } else if (data.type === "overcharge") {
      command = `game.lancer.prepareOverchargeMacro("${data.actorId}")`;
      img = `systems/lancer/assets/icons/macro-icons/overcharge.svg`;
    }
  }

  let macro = game.macros.entities.find((m: Macro) => m.name === title && (m.data as any).command === command);
  if (!macro) {
    Macro.create(
      {
        command,
        name: title,
        type: "script",
        img: img,
      },
      { displaySheet: false }
    ).then(macro => game.user.assignHotbarMacro(macro as Macro, slot));
  } else {
    game.user.assignHotbarMacro(macro, slot).then();
  }
}

function ownedItemFromString(i: string, actor: Actor): LancerItem<any> | null {
  // Get the item
  const item = (actor as any).items.get(i) as LancerItem<any> | null;
  if (!item) {
    ui.notifications.error(`Error preparing macro: could not find Item ${i} owned by Actor ${Actor.name}.`);
    return null;
  } else if (!item.isOwned) {
    ui.notifications.error(`Error preparing macro: ${item.name} is not owned by an Actor.`);
    return null;
  }

  return item;
}

/**
 * Generic macro preparer for any item.
 * Given an actor and item, will prepare data for the macro then roll it.
 * @param a The actor id to speak as
 * @param i The item id that is being rolled
 * @param options Ability to pass through various options to the item.
 *      Talents can use rank: value.
 *      Weapons can use accBonus or damBonus
 */
export async function prepareItemMacro(a: string, i: string, options?: any) {
  // Determine which Actor to speak as
  let actor: Actor | null = getMacroSpeaker(a);
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }

  const item = ownedItemFromString(i, actor);

  if (!item) return;

  // Make a macro depending on the type
  switch (item.data.type) {
    // Skills
    case EntryType.SKILL:
      let skillData: LancerStatMacroData = {
        title: item.name,
        bonus: (item as LancerSkill).data.data.rank * 2,
      };
      await rollTriggerMacro(actor, skillData);
      break;
    // Pilot OR Mech weapon
    case EntryType.PILOT_WEAPON:
    case EntryType.MECH_WEAPON:
      prepareAttackMacro({ actor, item, options });
      break;
    // Systems
    case EntryType.MECH_SYSTEM:
      await rollSystemMacro(actor, item.data.data.derived.mm);
      break;
    // Talents
    case EntryType.TALENT:
      // If we aren't passed a rank, default to current rank
      let rank = options.rank ? options.rank : item.data.data.curr_rank;

      let talData: LancerTalentMacroData = {
        talent: item.data.data,
        rank: rank,
      };

      await rollTalentMacro(actor, talData);
      break;
    // Gear
    case EntryType.PILOT_GEAR:
      let gearData: LancerTextMacroData = {
        title: item.name,
        description: (<LancerPilotGear>item).data.data.description,
        tags: (<LancerPilotGear>item).data.data.tags,
      };

      await rollTextMacro(actor, gearData);
      break;
    // Core bonuses can just be text, right?
    case EntryType.CORE_BONUS:
      let CBdata: LancerTextMacroData = {
        title: item.name,
        description: (<LancerCoreBonus>item).data.data.effect,
      };

      await rollTextMacro(actor, CBdata);
      break;
    case EntryType.NPC_FEATURE:
      let titem = item as LancerNpcFeature;
      switch (titem.data.data.type) {
        case NpcFeatureType.Weapon:
          await prepareAttackMacro({ actor, item, options });
          break;
        case NpcFeatureType.Tech:
          await prepareTechMacro(actor._id, item._id);
          break;
        case NpcFeatureType.System:
        case NpcFeatureType.Trait:
          let sysData: LancerTextMacroData = {
            title: item.name,
            description: <string>titem.data.data.effect,
            tags: titem.data.data.tags,
          };

          await rollTextMacro(actor, sysData);
          break;
        case NpcFeatureType.Reaction:
          let reactData: LancerReactionMacroData = {
            title: item.name,
            // Screw it, I'm not messing with all our item definitions just for this.
            //@ts-ignore
            trigger: titem.data.data.trigger as string,
            effect: titem.data.data.effect as string,
            tags: titem.data.data.tags,
          };

          await rollReactionMacro(actor, reactData);
          break;
      }
      break;
    default:
      console.log("No macro exists for that item type");
      return ui.notifications.error(`Error - No macro exists for that item type`);
  }

  applyCollapseListeners();
}

export function getMacroSpeaker(a_id?: string): LancerActor<any> | null {
  // Determine which Actor to speak as
  const speaker = ChatMessage.getSpeaker();
  // console.log(`${lp} Macro speaker`, speaker);
  let actor: Actor | null = null;
  // console.log(game.actors.tokens);
  try {
    if (speaker.token) {
      actor = (game.actors.tokens[speaker.token] as unknown) as Actor;
    }
  } catch (TypeError) {
    // Need anything here?
  }
  if (!actor) {
    actor = game.actors.get(speaker.actor, { strict: false });
  }
  if (!actor || (a_id && actor.id !== a_id)) {
    actor = game.actors.get(a_id!);
  }
  if (!actor || (a_id && actor.id !== a_id)) {
    actor = ((game.actors.tokens as any) as Record<string, Actor>)[a_id!];
  }
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
  }
  return actor ? (actor as LancerActor<any>) : null;
}

/**
 *
 */
export async function renderMacroTemplate(actor: Actor, template: string, templateData: any) {
  const cardUUID = uuid4();
  templateData._uuid = cardUUID;

  const html = await renderTemplate(template, templateData);
  let roll: Roll | undefined;
  // Create JSON for the aggregate rolls.
  let aggregate: any = {
    class: "Roll",
    dice: [],
    formula: "",
    terms: [],
    result: "",
  };
  if (templateData.roll) {
    roll = templateData.roll;
  }
  if (templateData.attacks) {
    const attacks: { roll: Roll; tt: string }[] = templateData.attacks;
    attacks.forEach(atk => {
      aggregate.formula += `+${atk.roll.formula}`;
      if (aggregate.terms.length > 0) aggregate.terms.push("+");
      atk.roll.terms.forEach(term => {
        aggregate.terms.push(term);
      });
      aggregate.result += (atk.roll as any).result;
    });
  }
  if (templateData.damages) {
    const damages: { roll: Roll; tt: string; d_type: string }[] = templateData.damages;
    damages.forEach(dmg => {
      aggregate.formula += `+${dmg.roll.formula}`;
      if (aggregate.terms.length > 0) aggregate.terms.push("+");
      dmg.roll.terms.forEach(term => {
        aggregate.terms.push(term);
      });
      aggregate.result += (dmg.roll as any).result;
    });
  }

  roll = Roll.fromJSON(JSON.stringify(aggregate));
  return renderMacroHTML(actor, html, roll);
}

export async function renderMacroHTML(actor: Actor, html: HTMLElement | string, roll?: Roll) {
  const rollMode = game.settings.get("core", "rollMode");
  const chat_data = {
    user: game.user,
    type: roll ? CONST.CHAT_MESSAGE_TYPES.ROLL : CONST.CHAT_MESSAGE_TYPES.IC,
    roll: roll,
    speaker: {
      actor: actor,
      token: actor.token,
      alias: actor.token ? actor.token.name : null,
    },
    content: html,
    whisper: rollMode !== "roll" ? ChatMessage.getWhisperRecipients("GM").filter(u => u.active) : undefined,
  };
  const cm = await ChatMessage.create(chat_data);
  cm.render();
  return Promise.resolve();
}

function getMacroActorItem(a: string, i: string): { actor: Actor | null; item: Item | null } {
  let result = { actor: null, item: null } as { actor: Actor | null; item: Item | null };
  // Find the Actor for a macro to speak as
  result.actor = getMacroSpeaker(a);
  if (!result.actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return result;
  }

  // Find the item
  result.item = result.actor.getOwnedItem(i) as Item | null;
  if (!result.item) {
    ui.notifications.warn(`Failed to find Item for macro.`);
    return result;
  }
  return result;
}

async function buildAttackRollString(
  title: string,
  flags: AccDiffFlag[],
  bonus: number,
  starting?: [number, number] // initial [accuracy, difficulty]
): Promise<string | null> {
  let abort: boolean = false;
  let acc = 0;
  await promptAccDiffModifier(flags, title, starting).then(
    resolve => (acc = resolve),
    reject => (abort = reject)
  );
  if (abort) return null;

  // Do the attack rolling
  let acc_str = acc != 0 ? ` + ${acc}d6kh1` : "";
  return `1d20+${bonus}${acc_str}`;
}

export async function prepareStatMacro(a: string, statKey: string) {
  // Determine which Actor to speak as
  let actor: LancerActor<EntryType.PILOT> | null = getMacroSpeaker(a);
  if (!actor) return;

  const statPath = statKey.split(".");

  let mm_ent = await actor.data.data.derived.mm_promise;

  let bonus: number = resolve_dotpath(mm_ent, statKey.substr(3));

  let mData: LancerStatMacroData = {
    title: statPath[statPath.length - 1].toUpperCase(),
    bonus: bonus,
  };
  if (mData.title === "TECHATTACK") {
    rollTechMacro(actor, { acc: 0, action: "Quick", t_atk: bonus, effect: "", tags: [], title: "" });
  } else {
    rollStatMacro(actor, mData).then();
  }
}

// Rollers

async function rollTriggerMacro(actor: Actor, data: LancerStatMacroData) {
  return await rollStatMacro(actor, data);
}

async function rollStatMacro(actor: Actor, data: LancerStatMacroData) {
  if (!actor) return Promise.resolve();

  // Get accuracy/difficulty with a prompt
  let acc: number = 0;
  let abort: boolean = false;
  await promptAccDiffModifier().then(
    resolve => (acc = resolve),
    () => (abort = true)
  );
  if (abort) return Promise.resolve();

  // Do the roll
  let acc_str = acc != 0 ? ` + ${acc}d6kh1` : "";
  // @ts-ignore .8
  let roll = await new Roll(`1d20+${data.bonus || 0}${acc_str}`).evaluate({ async: true });

  const roll_tt = await roll.getTooltip();

  // Construct the template
  const templateData = {
    title: data.title,
    roll: roll,
    roll_tooltip: roll_tt,
    effect: data.effect ? data.effect : null,
  };
  const template = `systems/lancer/templates/chat/stat-roll-card.hbs`;
  return renderMacroTemplate(actor, template, templateData);
}

async function rollSystemMacro(actor: Actor, data: MechSystem) {
  if (!actor) return Promise.resolve();

  // Construct the template
  const html = await buildSystemHTML(data);
  return renderMacroHTML(actor, html);
}

async function rollTalentMacro(actor: Actor, data: LancerTalentMacroData) {
  if (!actor) return Promise.resolve();

  // Construct the template
  const templateData = {
    title: data.talent.name,
    rank: data.talent.ranks[data.rank],
    lvl: data.rank,
  };
  const template = `systems/lancer/templates/chat/talent-card.hbs`;
  return renderMacroTemplate(actor, template, templateData);
}

/**
 * Standalone prepare function for attacks, since they're complex.
 * @param actor   {Actor}       Actor to roll as. Assumes properly prepared item.
 * @param item    {LancerItem}  Weapon to attack with. Assumes ownership from actor.
 * @param options {Object}      Options that can be passed through. Current options:
 *            - accBonus        Flat bonus to accuracy
 *            - damBonus        Object of form {type: val} to apply flat damage bonus of given type.
 *                              The "Bonus" type is recommended but not required
 */
async function prepareAttackMacro({
  actor,
  item,
  options,
}: {
  actor: Actor;
  item: LancerItem<any>;
  options?: {
    accBonus: number;
    damBonus: { type: DamageType; val: number };
  };
}) {
  let mData: LancerAttackMacroData = {
    title: item.name,
    grit: 0,
    acc: 0,
    damage: [],
    tags: item.data.data.derived.mm.Tags,
    overkill: false,
    effect: "",
    loaded: true,
    destroyed: false,
  };

  let weaponData: NpcFeature | PilotWeapon | MechWeaponProfile;
  let pilotEnt: Pilot;

  // We can safely split off pilot/mech weapons by actor type
  if (actor.data.type === EntryType.MECH) {
    pilotEnt = (await actor.data.data.derived.mm_promise).Pilot;
    let itemEnt: MechWeapon = await item.data.data.derived.mm_promise;

    weaponData = itemEnt.SelectedProfile;

    mData.loaded = itemEnt.Loaded;
    mData.destroyed = itemEnt.Destroyed;
    mData.damage = weaponData.BaseDamage;
    mData.grit = pilotEnt.Grit;
    mData.acc = 0;
    mData.tags = weaponData.Tags;
    mData.overkill = is_overkill(itemEnt);    
    mData.effect = weaponData.Effect;
  } else if (actor.data.type === EntryType.PILOT) {
    pilotEnt = await actor.data.data.derived.mm_promise;
    let itemEnt: PilotWeapon = await item.data.data.derived.mm_promise;
    weaponData = itemEnt;

    mData.loaded = itemEnt.Loaded;
    mData.damage = weaponData.Damage;
    mData.grit = pilotEnt.Grit;
    mData.acc = 0;
    mData.tags = weaponData.Tags;
    mData.overkill = is_overkill(itemEnt);
    mData.effect = weaponData.Effect;
  } else if (actor.data.type === EntryType.NPC) {
    const mm: NpcFeature = item.data.data.derived.mm;
    let tier_index: number = mm.TierOverride;
    if(!mm.TierOverride) {
      if (item.actor === null) {
        // Use selected actor
        tier_index = actor.data.data.tier - 1;
      } else {
        // Use provided actor
        tier_index = item.actor.data.data.tier - 1;
      }
    } else {
      // Fix to be index
      tier_index--;
    }

    mData.loaded = mm.Loaded;
    // mData.destroyed = item.data.data.destroyed; TODO: NPC weapons don't seem to have a destroyed field
    // This can be a string... but can also be a number...
    mData.grit = Number(mm.AttackBonus[tier_index]) || 0;
    mData.acc = mm.Accuracy[tier_index];

    // Reduce damage values to only this tier
    mData.damage = mm.Damage[tier_index] ?? [];

    mData.tags = mm.Tags
    mData.overkill = funcs.is_overkill(mm);
    mData.on_hit = mm.OnHit;
    mData.effect = mm.Effect;
  } else {
    ui.notifications.error(`Error preparing attack macro - ${actor.name} is an unknown type!`);
    return Promise.resolve();
  }

  // Check for damages that are missing type
  let typeMissing = false;
  mData.damage.forEach((d: any) => {
    if (d.type === "" && d.val != "" && d.val != 0) typeMissing = true;
  });
  // Warn about missing damage type if the value is non-zero
  if (typeMissing) {
    ui.notifications.warn(`Warning: ${item.name} has a damage value without type!`);
  }

  // Options processing
  if (options) {
    if (options.accBonus) {
      mData.grit += options.accBonus;
    }
    if (options.damBonus) {
      let i = mData.damage.findIndex((dam: RegDamageData) => {
        return dam.type === options.damBonus.type;
      });
      if (i >= 0) {
        // We need to clone so it doesn't go all the way back up to the weapon
        let damClone = { ...mData.damage[i] };
        if (damClone.val > 0) {
          damClone.val = `${damClone.val}+${options.damBonus.val}`;
        } else {
          damClone.val = options.damBonus.val;
        }
        mData.damage[i] = damClone;
      } else {
        mData.damage.push(options.damBonus);
      }
    }
  }
  // Check if weapon if loaded.
  if (game.settings.get(LANCER.sys_name, LANCER.setting_automation_attack)) {
    if (!mData.loaded) {
      ui.notifications.warn(`Weapon ${item.data.data.name} is not loaded!`);
      return;
    }
    if (mData.destroyed) {
      ui.notifications.warn(`Weapon ${item.data.data.name} is destroyed!`);
      return;
    }
  }

  // Build attack string before deducting charge.
  const atk_str = await buildAttackRollString(
    mData.title,
    tagsToFlags(mData.tags),
    mData.grit,
    mData.acc > 0 ? [mData.acc, 0] : [0, -mData.acc]
  );
  if (!atk_str) return;

  // Deduct charge if LOADING weapon.
  if (
    game.settings.get(LANCER.sys_name, LANCER.setting_automation_attack) &&
    mData.tags.find(tag => tag.Tag.LID === "tg_loading")
  ) {
    console.debug(item);
    console.debug(actor);

    let itemEnt: MechWeapon = await item.data.data.derived.mm_promise;
    itemEnt.Loaded = false;
    await itemEnt.writeback();
  }

  await rollAttackMacro(actor, atk_str, mData);
}

async function rollAttackMacro(actor: Actor, atk_str: string | null, data: LancerAttackMacroData) {
  if (!atk_str) return;

  // IS SMART?
  const isSmart = data.tags.findIndex(tag => tag.Tag.LID === "tg_smart") > -1;
  // CHECK TARGETS
  const targets = getTargets();
  let hits: {
    token: { name: string; img: string };
    total: string;
    hit: boolean;
    crit: boolean;
  }[] = [];
  let attacks: { roll: Roll; tt: HTMLElement | JQuery<HTMLElement> }[] = [];
  if (game.settings.get(LANCER.sys_name, LANCER.setting_automation_attack) && targets.length > 0) {
    for (const target of targets) {
      // @ts-ignore .8
      let attack_roll = await new Roll(atk_str!).evaluate({ async: true });
      const attack_tt = await attack_roll.getTooltip();
      attacks.push({ roll: attack_roll, tt: attack_tt });

      hits.push({
        token: {
          name: target.token ? target.token.data.name : target.data.name,
          img: target.token ? target.token.data.img : target.data.img,
        },
        total: String(attack_roll._total).padStart(2, "0"),
        hit: await checkForHit(isSmart, attack_roll, target),
        crit: attack_roll._total >= 20,
      });
    }
  } else {
    // @ts-ignore .8
    let attack_roll = await new Roll(atk_str).evaluate({ async: true });
    const attack_tt = await attack_roll.getTooltip();
    attacks.push({ roll: attack_roll, tt: attack_tt });
  }

  // Iterate through damage types, rolling each
  let damage_results: Array<{
    roll: Roll;
    tt: HTMLElement | JQuery;
    d_type: DamageType;
  }> = [];
  let crit_damage_results: Array<{
    roll: Roll;
    tt: HTMLElement | JQuery;
    d_type: DamageType;
  }> = [];
  let overkill_heat: number = 0;

  // If there is at least one non-crit hit, evaluate normal damage.
  if (
    (hits.length === 0 && attacks.find(attack => attack.roll._total < 20)) ||
    hits.find(hit => hit.hit && !hit.crit)
  ) {
    for (const x of data.damage) {
      if (x.Value === "" || x.Value == 0) continue; // Skip undefined and zero damage
      let d_formula: string = x.Value.toString();
      let droll: Roll | null = new Roll(d_formula);
      // Add overkill if enabled.
      if (data.overkill) {
        droll.terms.forEach(term => {
          if (term.faces) {
            term.modifiers.push("x1");
            term.modifiers.push(`kh1`);
          }
        });
      }

      let tt: HTMLElement | JQuery | null;
      try {
        // @ts-ignore .8
        await droll.evaluate({ async: true });
        tt = await droll.getTooltip();
      } catch {
        droll = null;
        tt = null;
      }
      if (data.overkill && droll) {
        // Count overkill heat
        // @ts-ignore
        droll.terms.forEach(p => {
          if (p.results && Array.isArray(p.results)) {
            p.results.forEach((r: any) => {
              if (r.exploded) {
                overkill_heat += 1;
              }
            });
          }
        });
      }
      if (droll && tt) {
        damage_results.push({
          roll: droll,
          tt: tt,
          d_type: x.DamageType,
        });
      }
    }
  }

  // If there is at least one crit hit, evaluate crit damage
  if ((hits.length === 0 && attacks.find(attack => attack.roll._total >= 20)) || hits.find(hit => hit.crit)) {
    // if (hits.length === 0 || hits.find(hit => hit.crit)) {
    for (const x of data.damage) {
      if (x.Value === "" || x.Value == 0) continue; // Skip undefined and zero damage
      let d_formula: string = x.Value.toString();
      let droll: Roll | null = new Roll(d_formula);
      // double all dice, add KH. Add overkill if necessary.
      droll.terms.forEach(term => {
        if (term.faces) {
          term.modifiers === undefined && (term.modifiers = []);
          term.modifiers.push(`kh${term.number}`);
          data.overkill && term.modifiers.push("x1");
          term.number *= 2;
        }
      });

      let tt: HTMLElement | JQuery | null;
      try {
        // @ts-ignore .8
        await droll.evaluate({ async: true });
        tt = await droll.getTooltip();
      } catch {
        droll = null;
        tt = null;
      }
      if (data.overkill && droll) {
        // Count overkill heat
        // @ts-ignore
        droll.terms.forEach(p => {
          if (p.results && Array.isArray(p.results)) {
            p.results.forEach((r: any) => {
              if (r.exploded) {
                overkill_heat += 1;
              }
            });
          }
        });
      }
      if (droll && tt) {
        crit_damage_results.push({
          roll: droll,
          tt: tt,
          d_type: x.DamageType,
        });
      }
    }
  }

  if (
    game.settings.get(LANCER.sys_name, LANCER.setting_automation) &&
    game.settings.get(LANCER.sys_name, LANCER.setting_overkill_heat)
  ) {
    let mment: AnyMMActor = await actor.data.data.derived.mm_promise;
    if(mment.Type === EntryType.MECH) {
      mment.CurrentHeat += overkill_heat;
      await mment.writeback();
    }
  }

  // Output
  const templateData = {
    title: data.title,
    attacks: attacks,
    hits: hits,
    defense: isSmart ? "E-DEF" : "EVASION",
    damages: damage_results,
    crit_damages: crit_damage_results,
    overkill_heat: overkill_heat,
    effect: data.effect ? data.effect : null,
    on_hit: data.on_hit ? data.on_hit : null,
    tags: data.tags,
  };

  console.debug(templateData);
  const template = `systems/lancer/templates/chat/attack-card.hbs`;
  return await renderMacroTemplate(actor, template, templateData);
}

/**
 * Rolls an NPC reaction macro when given the proper data
 * @param actor {Actor} Actor to roll as. Assumes properly prepared item.
 * @param data {LancerReactionMacroData} Reaction macro data to render.
 */
export function rollReactionMacro(actor: Actor, data: LancerReactionMacroData) {
  if (!actor) return Promise.resolve();

  const template = `systems/lancer/templates/chat/reaction-card.hbs`;
  return renderMacroTemplate(actor, template, data);
}

/**
 * Prepares a macro to present core active information for
 * @param a     String of the actor ID to roll the macro as, and who we're getting core info for
 */
export async function prepareCoreActiveMacro(a: string) {
  // Determine which Actor to speak as
  let mech: LancerActor<EntryType.MECH> | null = getMacroSpeaker(a);
  if (!mech) return;

  var ent = await mech.data.data.derived.mm_promise;
  if (!ent.Frame) return;

  if (!ent.CurrentCoreEnergy) {
    ui.notifications.warn(`No core power remaining on this frame!`);
    return;
  }

  let mData: LancerTextMacroData = {
    title: ent.Frame.CoreSystem.ActiveName,
    description: ent.Frame.CoreSystem.ActiveEffect,
    tags: ent.Frame.CoreSystem.Tags,
  };

  // TODO--setting for this?
  new Dialog({
    title: "Consume Core Power?",
    content: "Consume your mech's core power?",
    buttons: {
      submit: {
        icon: '<i class="fas fa-check"></i>',
        label: "Yes",
        callback: async dlg => {
          mech?.update({ "data.current_core_energy": Math.max(ent.CurrentCoreEnergy - 1, 0) });
          console.log(`Automatically consumed core power for ${ent.LID}`);
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "No",
      },
    },
    default: "submit",
  }).render(true);

  rollTextMacro(mech, mData).then();
}

/**
 * Prepares a macro to present core passive information for
 * Checks whether they have a passive since that could get removed on swap
 * @param a     String of the actor ID to roll the macro as, and who we're getting core info for
 */
export function prepareCorePassiveMacro(a: string) {
  console.log("DISABLED");
  debugger;
  return;
  /*
  // Determine which Actor to speak as
  let actor: LancerActor | null = getMacroSpeaker(a);
  if (!actor) return;

  let frame: LancerFrameItemData | null = actor.getCurrentFrame();

  if (!frame || !frame.data.core_system.passive_name || !frame.data.core_system.passive_effect) {
    // Could probably handle this better eventually
    return;
  }

  let mData: LancerTextMacroData = {
    title: frame.data.core_system.passive_name,
    description: frame.data.core_system.passive_effect,
    tags: frame.data.core_system.tags,
  };

  rollTextMacro(actor, mData).then();
  */
}

/**
 * Given basic information, prepares a generic text-only macro to display descriptions etc
 * @param a     String of the actor ID to roll the macro as
 * @param title Data path to title of the macro
 * @param text  Data path to text to be displayed by the macro
 * @param tags  Can optionally pass through an array of tags to be rendered
 */
export function prepareTextMacro(a: string, title: string, text: string, tags?: TagInstance[]) {
  // Determine which Actor to speak as
  let actor: Actor | null = getMacroSpeaker(a);
  if (!actor) return;

  // Note to self--use this in the future if I need string -> var lookup: var.split('.').reduce((o,i)=>o[i], game.data)
  let mData: LancerTextMacroData = {
    title: title,
    description: text,
    tags: tags,
  };

  rollTextMacro(actor, mData).then();
}

/**
 * Given prepared data, handles rolling of a generic text-only macro to display descriptions etc.
 * @param actor {Actor} Actor rolling the macro.
 * @param data {LancerTextMacroData} Prepared macro data.
 */
async function rollTextMacro(actor: Actor, data: LancerTextMacroData) {
  if (!actor) return Promise.resolve();

  const template = `systems/lancer/templates/chat/generic-card.hbs`;
  return renderMacroTemplate(actor, template, data);
}

export async function prepareTechMacro(a: string, t: string) {
  // Determine which Actor to speak as
  let actor: Actor | null = getMacroSpeaker(a);
  if (!actor) return;

  // Get the item
  const item: LancerItem<EntryType.NPC_FEATURE> | LancerItem<EntryType.MECH_SYSTEM> | null = actor.getOwnedItem(t) as
    | LancerItem<EntryType.NPC_FEATURE>
    | LancerItem<EntryType.MECH_SYSTEM>
    | null;
  if (!item) {
    return ui.notifications.error(
      `Error preparing tech attack macro - could not find Item ${t} owned by Actor ${a}! Did you add the Item to the token, instead of the source Actor?`
    );
  } else if (!item.isOwned) {
    return ui.notifications.error(`Error rolling tech attack macro - ${item.name} is not owned by an Actor!`);
  }

  let mData: LancerTechMacroData = {
    title: item.name,
    t_atk: 0,
    acc: 0,
    effect: "",
    tags: [],
    action: "",
  };
  if (item.type === EntryType.MECH_SYSTEM) {
    debugger;
    /*
    const tData = item.data.data as LancerMechSystemData;
    mData.t_atk = (item.actor!.data as LancerPilotActorData).data.mech.tech_attack;
    mData.tags = tData.tags;
    mData.effect = ""; // TODO */
  } else if (item.type === EntryType.NPC_FEATURE) {
    const mm: NpcFeature = await item.data.data.derived.mm_promise;
    let tier_index: number = mm.TierOverride;
    if(!mm.TierOverride) {
      if (item.actor === null) {
        // Use selected actor
        tier_index = actor.data.data.tier - 1;
      } else {
        // Use provided actor
        tier_index = item.actor.data.data.tier - 1;
      }
    } else {
      // Correct to be index
      tier_index -= 1;
    }

    mData.t_atk = mm.AttackBonus[tier_index] ?? 0;
    mData.acc = mm.Accuracy[tier_index] ?? 0;
    mData.tags = mm.Tags;
    mData.effect = mm.Effect;
    mData.action = mm.TechType;
  } else {
    ui.notifications.error(`Error rolling tech attack macro`);
    return Promise.resolve();
  }
  console.log(`${lp} Tech Attack Macro Item:`, item, mData);

  await rollTechMacro(actor, mData);
}

async function rollTechMacro(actor: Actor, data: LancerTechMacroData) {
  let atk_str = await buildAttackRollString(data.title, tagsToFlags(data.tags), data.t_atk);
  if (!atk_str) return;

  // CHECK TARGETS
  const targets = getTargets();
  let hits: {
    token: { name: string; img: string };
    total: string;
    hit: boolean;
    crit: boolean;
  }[] = [];
  let attacks: { roll: Roll; tt: HTMLElement | JQuery<HTMLElement> }[] = [];
  if (game.settings.get(LANCER.sys_name, LANCER.setting_automation_attack) && targets.length > 0) {
    for (const target of targets) {
      // @ts-ignore .8
      let attack_roll = await new Roll(atk_str!).evaluate({ async: true });
      const attack_tt = await attack_roll.getTooltip();
      attacks.push({ roll: attack_roll, tt: attack_tt });

      hits.push({
        token: {
          name: target.token ? target.token.data.name : target.data.name,
          img: target.token ? target.token.data.img : target.data.img,
        },
        total: String(attack_roll._total).padStart(2, "0"),
        hit: await checkForHit(true, attack_roll, target),
        crit: attack_roll._total >= 20,
      });
    }
  } else {
    // @ts-ignore .8
    let attack_roll = await new Roll(atk_str).evaluate({ async: true });
    const attack_tt = await attack_roll.getTooltip();
    attacks.push({ roll: attack_roll, tt: attack_tt });
  }

  // Output
  const templateData = {
    title: data.title,
    attacks: attacks,
    hits: hits,
    action: data.action,
    effect: data.effect ? data.effect : null,
    tags: data.tags,
  };

  const template = `systems/lancer/templates/chat/tech-attack-card.hbs`;
  return await renderMacroTemplate(actor, template, templateData);
}

export async function promptAccDiffModifier(flags?: AccDiffFlag[], title?: string, starting?: [number, number]) {
  let template = await renderTemplate(`systems/lancer/templates/window/acc_diff.hbs`, {});
  return new Promise<number>((resolve, reject) => {
    new Dialog({
      title: title ? `${title} - Accuracy and Difficulty` : "Accuracy and Difficulty",
      content: template,
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: "Submit",
          callback: async dialog => {
            let total = updateTotals();
            console.log(`${lp} Dialog returned a modifier of ${total}d6`);
            resolve(total);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: async () => {
            reject(true);
          },
        },
      },
      default: "submit",
      render: (_html: any) => {
        if (flags) {
          for (let flag of flags) {
            const ret = document.querySelector(`[data-acc="${flag}"],[data-diff="${flag}"]`);
            ret && ((ret as HTMLInputElement).checked = true);
          }
        }

        if (flags?.includes("SEEKING")) {
          toggleCover(false);
        }
        updateTotals();

        if (starting) {
          $("#accdiff-other-acc").val(starting[0]);
          $("#accdiff-other-diff").val(starting[1]);
          updateTotals();
        }

        // LISTENERS
        $("[data-acc],[data-diff]").on("click", e => {
          if (e.currentTarget.dataset.acc === "SEEKING") {
            toggleCover(!(e.currentTarget as HTMLInputElement).checked);
          }
          updateTotals();
        });
        $(".accdiff-grid button.dec-set").on("click", _e => {
          updateTotals();
        });
      },
      close: () => reject(true),
    } as DialogData).render(true);
  });
}

export async function prepareOverchargeMacro(a: string) {
  // Determine which Actor to speak as
  let actor: LancerActor<any> | null = getMacroSpeaker(a);
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }

  // Validate that we're overcharging a mech
  if (actor.data.type !== EntryType.MECH) {
    ui.notifications.warn(`Only mechs can overcharge!`);
    return null;
  }

  // And here too... we should probably revisit our type definitions...
  let rollText = actor.getOverchargeRoll();
  if (!rollText) {
    ui.notifications.warn(`Error in getting overcharge roll...`);
    return null;
  }

  // Prep data
  // @ts-ignore .8
  let roll = await new Roll(rollText).evaluate({ async: true });

  let mech: Mech = actor.data.data.derived.mm;

  let mData: LancerOverchargeMacroData = {
    level: mech.CurrentOvercharge,
    roll: roll,
  };

  // Assume we can always increment overcharge here...
  mech.CurrentOvercharge = Math.min(mech.CurrentOvercharge + 1, 3);

  // Only increase heat if we haven't disabled it
  if (
    game.settings.get(LANCER.sys_name, LANCER.setting_automation) &&
    game.settings.get(LANCER.sys_name, LANCER.setting_pilot_oc_heat)
  ) {
    mech.CurrentHeat = mech.CurrentHeat + roll.total;
  }

  await mech.writeback();

  return rollOverchargeMacro(actor, mData);
}

async function rollOverchargeMacro(actor: Actor, data: LancerOverchargeMacroData) {
  if (!actor) return Promise.resolve();

  const roll_tt = await data.roll.getTooltip();

  // Construct the template
  const templateData = {
    actorName: actor.name,
    roll: data.roll,
    level: data.level,
    roll_tooltip: roll_tt,
  };
  const template = `systems/lancer/templates/chat/overcharge-card.hbs`;
  return renderMacroTemplate(actor, template, templateData);
}

export async function prepareChargeMacro(a: string) {
  // Determine which Actor to speak as
  let mech: LancerActor<EntryType.MECH> | null = getMacroSpeaker(a);
  if (!mech) return;
  const ent = mech.data.data.derived.mm;
  const feats: NpcFeature[] = (ent as any).Features;
  if (!feats) return;

  // Make recharge roll.
  // @ts-ignore .8
  const roll = await new Roll("1d6").evaluate({ async: true });
  const roll_tt = await roll.getTooltip();
  // Iterate over each system with recharge, if val of tag is lower or equal to roll, set to charged.

  let changed: { name: string; target: string | null | number | undefined; charged: boolean }[] = [];
  feats.forEach(feat => {
    if (!feat.Charged) {
      const recharge = feat.Tags.find((tag: TagInstance) => tag.Tag.LID === "tg_recharge");
      if (recharge && recharge.Value && recharge.Value <= roll.total) {
        feat.Charged = true;
        feat.writeback();
      }
      changed.push({ name: feat.Name, target: recharge?.Value, charged: feat.Charged });
    }
  });

  // Skip chat if no changes found.
  if (changed.length === 0) return;

  // Render template.
  const templateData = {
    actorName: mech.name,
    roll: roll,
    roll_tooltip: roll_tt,
    changed: changed,
  };
  const template = `systems/lancer/templates/chat/charge-card.hbs`;
  return renderMacroTemplate(mech, template, templateData);
}

/**
 * Performs a roll on the overheat table for the given actor
 * @param a ID of actor to overheat
 */
export async function prepareOverheatMacro(a: string) {
  // Determine which Actor to speak as
  let actor: LancerActor<any> | null = getMacroSpeaker(a);
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }

  // Hand it off to the actor to overheat
  await actor.overheat();
}

/**
 * Performs a roll on the structure table for the given actor
 * @param a ID of actor to structure
 */
export async function prepareStructureMacro(a: string) {
  // Determine which Actor to speak as
  let actor: LancerActor<any> | null = getMacroSpeaker(a);

  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }

  // Hand it off to the actor to structure
  await actor.structure();
}

export async function prepareActivationMacro(a: string, i: string, type: ActivationOptions, index: number) {
  // Determine which Actor to speak as
  let actor: Actor | null = getMacroSpeaker(a);
  if (!actor) return;

  // Get the item
  const item: LancerItem<EntryType.NPC_FEATURE> | LancerItem<EntryType.MECH_SYSTEM> | null = actor.getOwnedItem(i) as
    | LancerItem<EntryType.NPC_FEATURE>
    | LancerItem<EntryType.MECH_SYSTEM>
    | null;
  if (!item) {
    return ui.notifications.error(
      `Error preparing tech attack macro - could not find Item ${i} owned by Actor ${a}! Did you add the Item to the token, instead of the source Actor?`
    );
  } else if (!item.isOwned) {
    return ui.notifications.error(`Error rolling tech attack macro - ${item.name} is not owned by an Actor!`);
  }

  let itemEnt: MechSystem | NpcFeature = await item.data.data.derived.mm_promise;
  let actorEnt: Mech = await actor.data.data.derived.mm_promise;

  // TODO--handle NPC Activations
  if (itemEnt.Type === EntryType.NPC_FEATURE) return;

  switch (type) {
    case ActivationOptions.ACTION:
      switch (itemEnt.Actions[index].Activation) {
        case ActivationType.FullTech:
        case ActivationType.Invade:
        case ActivationType.QuickTech:
          _prepareTechActionMacro(actorEnt, itemEnt, index);
          break;
        default:
          _prepareTextActionMacro(actorEnt, itemEnt, index);
      }
      return;
    case ActivationOptions.DEPLOYABLE:
      _prepareDeployableMacro(actorEnt, itemEnt, index);
      return;
  }

  throw Error("You shouldn't be here!");
}

async function _prepareTextActionMacro(actorEnt: Mech, itemEnt: MechSystem | NpcFeature, index: number) {
  // Support this later...
  if (itemEnt.Type !== EntryType.MECH_SYSTEM) return;

  let action = itemEnt.Actions[index];

  await renderMacroHTML(actorEnt.Flags.orig_doc, buildActionHTML(action, { full: true, tags: itemEnt.Tags }));
}

async function _prepareTechActionMacro(actorEnt: Mech, itemEnt: MechSystem | NpcFeature, index: number) {
  // Support this later...
  if (itemEnt.Type !== EntryType.MECH_SYSTEM) return;

  let action = itemEnt.Actions[index];

  let mData: LancerTechMacroData = {
    title: itemEnt.Name,
    t_atk: 0,
    acc: 0,
    action: action.Name.toUpperCase(),
    effect: action.Detail,
    tags: itemEnt.Tags,
  };

  mData.t_atk = actorEnt.TechAttack;
  mData.tags = itemEnt.Tags;

  /*
  if (item.type === EntryType.NPC_FEATURE) {
    const tData = item.data.data as RegNpcTechData;
    let tier: number;
    if (item.actor === null) {
      tier = actor.data.data.tier_num - 1;
    } else {
      tier = item.actor.data.data.tier_num - 1;
    }
    mData.t_atk =
      tData.attack_bonus && tData.attack_bonus.length 6> tier ? tData.attack_bonus[tier] : 0;
    mData.acc = tData.accuracy && tData.accuracy.length > tier ? tData.accuracy[tier] : 0;
    mData.tags = await SerUtil.process_tags(new FoundryReg(), new OpCtx(), tData.tags);
    mData.detail = tData.effect ? tData.effect : "";
  } */

  await rollTechMacro(actorEnt.Flags.orig_doc, mData);
}

async function _prepareDeployableMacro(actorEnt: Mech, itemEnt: MechSystem | NpcFeature, index: number) {
  // Support this later...
  if (itemEnt.Type !== EntryType.MECH_SYSTEM) return;

  let dep = itemEnt.Deployables[index];

  await renderMacroHTML(actorEnt.Flags.orig_doc, buildDeployableHTML(dep, true));
}

export async function fullRepairMacro(a: string) {
  // Determine which Actor to speak as
  let actor: LancerActor<any> | null = getMacroSpeaker(a);
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }

  return new Promise<number>((resolve, reject) => {
    new Dialog({
      title: `FULL REPAIR - ${actor?.name}`,
      content: `<h3>Are you sure you want to fully repair the ${actor?.data.type} ${actor?.name}?`,
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: "Yes",
          callback: async dlg => {
            // Gotta typeguard the actor again
            if (!actor) return;

            await actor.full_repair();

            prepareTextMacro(a, "REPAIRED", `Notice: ${actor.name} has been fully repaired.`);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "No",
          callback: async () => {
            reject(true);
          },
        },
      },
      default: "submit",
      close: () => reject(true),
    }).render(true);
  });
}

export async function stabilizeMacro(a: string) {
  // Determine which Actor to speak as
  let actor: LancerActor<any> | null = getMacroSpeaker(a);
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }

  let template = await renderTemplate(`systems/lancer/templates/window/promptStabilize.hbs`, {});

  return new Promise<number>((resolve, reject) => {
    new Dialog({
      title: `STABILIZE - ${actor?.name}`,
      content: template,
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: "Submit",
          callback: async dlg => {
            // Gotta typeguard the actor again
            if (!actor) return;

            let o1 = <StabOptions1>$(dlg).find(".stabilize-options-1:checked").first().val();
            let o2 = <StabOptions2>$(dlg).find(".stabilize-options-2:checked").first().val();

            let text = await actor.stabilize(o1, o2);

            if (!text) return;

            prepareTextMacro(
              a,
              `${actor.name.capitalize()} HAS STABILIZED`,
              `${actor.name} has stabilized.<br>${text}`
            );
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: async () => {
            reject(true);
          },
        },
      },
      default: "submit",
      close: () => reject(true),
    }).render(true);
  });
}
