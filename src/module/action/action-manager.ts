import type { LancerActor } from "../actor/lancer-actor";
import type { ActionTrackingData, ActionType } from ".";
import tippy from "tippy.js";
import { getActionTrackerOptions } from "../settings";
import { getActions, modAction, toggleAction, updateActions, _defaultActionData } from "./action-tracker";

// TODO: Properly namespace this flag into the system scope
declare global {
  interface FlagConfig {
    User: {
      "action-manager": {
        pos: {
          top: number;
          left: number;
        };
      };
    };
  }
}

export class LancerActionManager extends Application {
  static DEF_LEFT = 600;
  static DEF_TOP = 20;
  static enabled: boolean;

  target: LancerActor | null = null;

  constructor() {
    super();
  }

  async init() {
    // TODO: find the correct place to specify what game.system.id is expected to be
    LancerActionManager.enabled = getActionTrackerOptions().showHotbar && !game.settings.get("core", "noCanvas");
    if (LancerActionManager.enabled) {
      this.loadUserPos();
      await this.updateControlledToken();
      this.render(true);
    }
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/window/action_manager.hbs`,
      width: 310,
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
    return {
      position: this.position,
      // @ts-expect-error Should be fixed with v10 types
      name: this.target && this.target.name.toLocaleUpperCase(),
      actions: this.getActions(),
      clickable: game.user?.isGM || getActionTrackerOptions().allowPlayers,
    };
  }

  // DATA BINDING
  /**
   * Get proxy for ease of migration when we change over to MM data backing.
   * @returns actions map.
   */
  private getActions(): ActionTrackingData | null {
    return this.target ? getActions(this.target) : null;
  }
  /**
   * Set proxy for ease of migration when we change over to MM data backing.
   */
  private async updateActions(actor: LancerActor, actions: ActionTrackingData) {
    await updateActions(actor, actions);
    // this.token?.update({ "flags.lancer.actions": actions });
  }

  async reset() {
    await this.close();
    this.render(true);
  }

  async update(_force?: boolean) {
    if (LancerActionManager.enabled) {
      // console.log("Action Manager updating...");
      await this.updateControlledToken();
      this.render(true);
    }
  }

  async updateConfig() {
    if (getActionTrackerOptions().showHotbar && !game.settings.get("core", "noCanvas")) {
      await this.update();
      LancerActionManager.enabled = true;
    } else {
      this.close();
      LancerActionManager.enabled = false;
    }
  }

  private async updateControlledToken() {
    if (!canvas.ready) return;
    const token = canvas.tokens?.controlled?.[0];
    if (token && token.inCombat && token.actor) {
      const actor = token.actor as LancerActor;
      // TODO: Remove when action data is properly within MM.
      // @ts-expect-error Should be fixed with v10 types
      if ((actor.is_mech() || actor.is_npc()) && token.actor.system.action_tracker === undefined) {
        this.target = token.actor;
        return this.updateActions(token.actor, _defaultActionData(token.actor));
      }
    }
    this.target = null;
  }

  /**
   * Resets actions to their default state.
   */
  private async resetActions() {
    if (this.target) {
      console.log("Resetting " + this.target.name);
      modAction(this.target, false);

      // await ChatMessage.create({ user: game.userId, whisper: game.users!.contents.filter(u => u.isGM).map(u => u.id), content: `${this.target.name} has had their actions manually reset.` }, {})
    }
  }

  // UI //
  /** @override */
  activateListeners(html: JQuery) {
    // Enable dragging.
    this.dragElement(html);

    // Enable reset.
    html.find("#action-manager-reset").on("click", e => {
      e.preventDefault();
      this.resetActions();
    });

    // Enable action toggles.
    html.find("a.action[data-action]").on("click", e => {
      e.preventDefault();
      if (this.canMod()) {
        const action = e.currentTarget.dataset.action;
        action && this.target && toggleAction(this.target, action as ActionType);
      } else {
        console.log(`${game.user?.name} :: Users currently not allowed to toggle actions through action manager.`);
      }
    });

    // Enable tooltips.
    this.loadTooltips();
  }

  private loadUserPos() {
    // @ts-expect-error Should be fixed with v10 types
    if (!(game.user?.flags["action-manager"] && game.user.flags["action-manager"].pos)) return;

    // @ts-expect-error Should be fixed with v10 types
    const pos = game.user.flags["action-manager"].pos;
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

  private loadTooltips() {
    tippy('.action[data-action="protocol"]', {
      content: "Protocol",
    });
    tippy('.action[data-action="full"]', {
      content: "Full Action",
    });
    tippy('.action[data-action="quick"]', {
      content: "Quick Action",
    });
    tippy('.action[data-action="move"]', {
      content: "Movement Action",
    });
    tippy('.action[data-action="reaction"]', {
      content: "Reaction",
    });
    tippy('.action[data-action="free"]', {
      content: "Free Actions",
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
          xPos = xPos < 8 ? 0 : xPos - 8;
          yPos = yPos < 8 ? 0 : yPos - 8;
          if (xPos != elmnt.offsetLeft - pos1 || yPos != elmnt.offsetTop - pos2) {
            elmnt.style.top = yPos + "px";
            elmnt.style.left = xPos + "px";
          }
          console.log(`Action Manager | CACHING: ${xPos} || ${yPos}.`);
          game.user?.update({ flags: { "action-manager": { pos: { top: yPos, left: xPos } } } });
          appPos.top = yPos;
          appPos.left = xPos;
        }
      }
    });
  }

  private canMod() {
    return game.user?.isGM || getActionTrackerOptions().allowPlayers;
  }
}
