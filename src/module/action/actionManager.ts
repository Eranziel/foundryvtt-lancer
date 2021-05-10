import { EntryType } from "machine-mind";
import { LancerActor, LancerActorType } from "../actor/lancer-actor";
import { LancerGame } from "../lancer-game";
import { ActionData, ActionType } from ".";
import { LANCER } from "../config";

export const _defaultActionData = (target: Actor) => {
  return {
    protocol: true,
    move: getSpeed(target),
    full: true,
    quick: true,
    reaction: true,
    free: true,
  } as ActionData;
};
export const _endTurnActionData = () => {
  return {
    protocol: false,
    move: 0,
    full: false,
    quick: false,
    reaction: true,
    free: true,
  } as ActionData;
};

export class LancerActionManager extends Application {
  static DEF_LEFT = 600;
  static DEF_TOP = 20;
  static enabled: boolean;

  target: LancerActor<any> | null = null;

  constructor() {
    super();
  }

  async init() {
    LancerActionManager.enabled = game.settings.get(LANCER.sys_name, LANCER.setting_action_manager);
    this.loadUserPos();
    await this.updateControlledToken();
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/lancer/templates/window/action_manager.hbs",
      width: 360,
      height: 70,
      left: LancerActionManager.DEF_LEFT,
      top: LancerActionManager.DEF_TOP,
      scale: 1,
      popOut: false,
      minimizable: false,
      resizable: false,
      title: "action-manager",
    });
  }

  /** @override */
  getData(_options = {}) {
    const data = super.getData();
    data.position = this.position;
    data.name = this.target && this.target.data.name.toLocaleUpperCase();
    data.actions = this.getActions();
    return data;
  }

  // DATA BINDING
  /**
   * Get proxy for ease of migration when we change over to MM data backing.
   * @returns actions map.
   */
  private getActions(): ActionData | undefined {
    return this.target?.data.data.actions ? { ...this.target?.data.data.actions } : undefined;
  }
  /**
   * Set proxy for ease of migration when we change over to MM data backing.
   */
  private async updateActions(actor: LancerActor<any>, actions: ActionData) {
    await actor.update({ "data.actions": actions });
    // this.token?.update({ "flags.lancer.actions": actions });
  }
  //

  async update() {
    if (LancerActionManager.enabled) {
      // console.log("Action Manager updating...");
      await this.updateControlledToken();
      this.render(true);
    }
  }

  async updateConfig() {
    if (game.settings.get(LANCER.sys_name, LANCER.setting_action_manager)) {
      await this.update();
      LancerActionManager.enabled = true;
    } else {
      this.close();
      LancerActionManager.enabled = false;
    }
  }

  private async updateControlledToken() {
    const token = canvas.tokens.controlled[0] as Token;
    if (token && token.actor && (token.actor.data.type === "mech" || token.actor.data.type === "npc")) {
      this.target = token.actor as LancerActor<any>;

      // TEMPORARY HANDLING OF OLD TOKENS
      // TODO: Remove when action data is properly within MM.
      if (this.getActions() === undefined) {
        await this.updateActions(this.target, _defaultActionData(this.target));
      }
    } else this.target = null;
  }

  /**
   * Spends an action or triggers end turn effect (empty all actions).
   * @param actor actor to modify.
   * @param spend whether to refresh or spend an action.
   * @param type specific action to spend, or undefined for end-turn behavior.
   */
  async modAction(actor: LancerActor<any>, spend: boolean, type?: ActionType) {
    let actions = { ...actor.data.data.actions };
    if (actions) {
      switch (type) {
        case "move": // TODO: replace with tooltip for movement counting.
          actions.move = spend ? 0 : getSpeed(actor);
          break;
        case "free": // Never disabled
          actions.free = true;
          break;
        case "quick":
          if (spend) {
            actions.full ? (actions.full = false) : (actions.quick = false);
          } else {
            actions.quick = true;
          }
          break;
        case "full":
          if (spend) {
            actions.full = false;
            actions.quick = false;
          } else {
            actions.full = true;
          }
          break;
        case "protocol":
          actions.protocol = !spend;
          break;
        case "reaction":
          actions.reaction = !spend;
          break;

        case undefined:
          actions = spend ? _endTurnActionData() : _defaultActionData(actor);
      }

      // When any action is spent, disable protocol.
      if (spend) {
        actions.protocol = false;
      }
      const res = await this.updateActions(actor, actions);
      this.render();
    }
  }
  private async toggleAction(type: ActionType) {
    let actions = this.getActions();
    if (actions) {
      if (actions[type]) {
        await this.modAction(this.target!, true, type);
      } else {
        await this.modAction(this.target!, false, type);
      }
    }
  }

  // UI //
  /** @override */
  activateListeners(html: JQuery) {
    // Enable dragging.
    this.dragElement(html);

    // Enable action toggles.
    html.find("a.action[data-action]").on("click", e => {
      e.preventDefault();
      const action = e.currentTarget.dataset.action;
      action && this.toggleAction(action as ActionType);
    });
  }

  private loadUserPos() {
    if (!(game.user.data.flags["action-manager"] && game.user.data.flags["action-manager"].pos)) return;

    const pos = game.user.data.flags["action-manager"].pos;
    const appPos = this.position;
    return new Promise(resolve => {
      function loop() {
        let ele = document.getElementById("action-manager");
        if (ele) {
          const newTop = pos.top < 5 || pos.top > window.innerHeight + 5 ? LancerActionManager.DEF_TOP : pos.top;
          const newLeft = pos.left < 5 || pos.left > window.innerWidth + 5 ? LancerActionManager.DEF_LEFT : pos.left;

          appPos.top = newTop;
          appPos.left = newLeft;
          ele.style.top = newTop + "px";
          ele.style.left = newLeft + "px";
          resolve(true);
        } else {
          setTimeout(loop, 20);
        }
      }
      loop();
    });
  }

  // HELPERS //

  private dragElement(html: JQuery) {
    const appPos = this.position;
    html.find("#action-manager-drag").on("mousedown", ev => {
      ev.preventDefault();
      ev = ev || window.event;

      let hud = $(document.body).find("#action-manager");
      let marginLeft = parseInt(hud.css("marginLeft").replace("px", ""));
      let marginTop = parseInt(hud.css("marginTop").replace("px", ""));

      dragElement(document.getElementById("action-manager")!);
      let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;

      function dragElement(elmnt: HTMLElement) {
        elmnt.onmousedown = dragMouseDown;

        function dragMouseDown(e: MouseEvent) {
          e = e || window.event;
          e.preventDefault();
          pos3 = e.clientX;
          pos4 = e.clientY;

          document.onmouseup = closeDragElement;
          document.onmousemove = elementDrag;
        }

        function elementDrag(e: MouseEvent) {
          e = e || window.event;
          e.preventDefault();
          // calculate the new cursor position:
          pos1 = pos3 - e.clientX;
          pos2 = pos4 - e.clientY;
          pos3 = e.clientX;
          pos4 = e.clientY;
          // set the element's new position:
          elmnt.style.top = elmnt.offsetTop - pos2 - marginTop + "px";
          elmnt.style.left = elmnt.offsetLeft - pos1 - marginLeft + "px";
        }

        function closeDragElement() {
          // stop moving when mouse button is released:
          elmnt.onmousedown = null;
          document.onmouseup = null;
          document.onmousemove = null;
          let xPos = elmnt.offsetLeft - pos1 > window.innerWidth ? window.innerWidth : elmnt.offsetLeft - pos1;
          let yPos =
            elmnt.offsetTop - pos2 > window.innerHeight - 20 ? window.innerHeight - 100 : elmnt.offsetTop - pos2;
          xPos = xPos < 0 ? 0 : xPos;
          yPos = yPos < 0 ? 0 : yPos;
          if (xPos != elmnt.offsetLeft - pos1 || yPos != elmnt.offsetTop - pos2) {
            elmnt.style.top = yPos + "px";
            elmnt.style.left = xPos + "px";
          }
          console.log(`Action Manager | CACHING: ${xPos} || ${yPos}.`);
          game.user.update({ flags: { "action-manager": { pos: { top: yPos, left: xPos } } } });
          appPos.top = yPos;
          appPos.left = xPos;
        }
      }
    });
  }
}

function getSpeed(actor: Actor) {
  return actor.data.data?.derived?.mm?.Speed ? actor.data.data?.derived?.mm.Speed : 4;
}
