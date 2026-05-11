import { LANCER } from "../config";

export class LancerGamePause extends foundry.applications.ui.GamePause {
  /** override */
  async _prepareContext(_options: any): Promise<Pause.RenderContext> {
    const icon = await game.settings.get(game.system.id, LANCER.setting_pause_icon);
    console.log();
    const context = {
      ...(await super._prepareContext(_options)),
      icon: `systems/lancer/assets/faction-logos/${icon}.svg`,
      spin: false,
    };
    console.log("LancerGamePause", context);
    return context;
  }

  /** override */
  _replaceHTML(result: Pause.RenderHTMLReturn, content: HTMLElement, _options: any) {
    super._replaceHTML(result, content, _options);
    content.classList.add("lancer-pause");
  }
}
