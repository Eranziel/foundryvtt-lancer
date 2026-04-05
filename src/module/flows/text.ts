// Import TypeScript modules
import { LancerActor } from "../actor/lancer-actor";
import { LANCER } from "../config";
import { LancerItem } from "../item/lancer-item";
import type { UUIDRef } from "../source-template";
import { createChatMessageStep, renderTemplateStep } from "./_render";
import { Flow, type FlowState, type PostFlowHook, type PreFlowHook, type Step } from "./flow";
import { LancerFlowState } from "./interfaces";

const lp = LANCER.log_prefix;

export function registerTextSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("printGenericCard", printGenericCard);
  flowSteps.set("printGenericHTML", printGenericHTML);
}

declare module "fvtt-types/configuration" {
  namespace Hooks {
    interface HookConfig {
      "lancer.preFlow.SimpleTextFlow": PreFlowHook<SimpleTextFlow>;
      "lancer.postFlow.SimpleTextFlow": PostFlowHook<SimpleTextFlow>;
    }
  }
}

export class SimpleTextFlow extends Flow<LancerFlowState.TextRollData> {
  static steps = ["printGenericCard"];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data: Partial<LancerFlowState.TextRollData>) {
    const state: LancerFlowState.TextRollData = {
      title: data?.title ?? "",
      description: data?.description ?? "",
      tags: data?.tags ?? [],
    };
    if (!state.title && uuid instanceof LancerItem) state.title = uuid.name!;

    super(uuid, state);
  }

  override callAllPreFlowHooks(): void {
    Hooks.callAll("lancer.preFlow.SimpleTextFlow", this);
  }

  override callAllPostFlowHooks(success: boolean): void {
    Hooks.callAll("lancer.postFlow.SimpleTextFlow", this, success);
  }
}

export async function printGenericCard(state: FlowState<any>, options?: { template?: string }): Promise<boolean> {
  if (!state.data) throw new TypeError(`Flow state missing!`);
  renderTemplateStep(
    state.actor,
    options?.template || `systems/${game.system.id}/templates/chat/generic-card.hbs`,
    state.data
  );
  return true;
}

declare module "fvtt-types/configuration" {
  namespace Hooks {
    interface HookConfig {
      "lancer.preFlow.SimpleHTMLFlow": PreFlowHook<SimpleHTMLFlow>;
      "lancer.postFlow.SimpleHTMLFlow": PostFlowHook<SimpleHTMLFlow>;
    }
  }
}

export class SimpleHTMLFlow extends Flow<LancerFlowState.HTMLToChatData> {
  static steps = ["printGenericHTML"];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data: Partial<LancerFlowState.HTMLToChatData>) {
    const state: LancerFlowState.HTMLToChatData = {
      html: data?.html ?? "",
    };
    super(uuid, state);
  }

  override callAllPreFlowHooks(): void {
    Hooks.callAll("lancer.preFlow.SimpleHTMLFlow", this);
  }

  override callAllPostFlowHooks(success: boolean): void {
    Hooks.callAll("lancer.postFlow.SimpleHTMLFlow", this, success);
  }
}

async function printGenericHTML(state: FlowState<LancerFlowState.HTMLToChatData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Flow state missing!`);
  if (!state.data.html) {
    if (state.item) {
      const templateData = {
        title: state.item.name,
        description: (state.item.system as any).description ?? "", // Licenses don't have a description
        tags: (state.item.system as any).tags ?? undefined, // Frames don't have tags
      };
      state.data.html = await renderTemplate(`systems/${game.system.id}/templates/chat/generic-card.hbs`, templateData);
    } else if (state.actor) {
      const templateData = {
        title: state.actor.name,
      };
      state.data.html = await renderTemplate(`systems/${game.system.id}/templates/chat/generic-card.hbs`, templateData);
    }
  }
  createChatMessageStep(state.actor, state.data.html);
  return true;
}
