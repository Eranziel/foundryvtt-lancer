import type BaseGrid from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/grid/base.mjs";
import type { Point } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/types.mjs";
import { LANCER } from "./config";

declare global {
  interface DocumentClassConfig {
    Token: typeof LancerTokenDocument;
  }
  interface PlaceableObjectClassConfig {
    Token: typeof LancerToken;
  }
  interface FlagConfig {
    Token: {
      lancer: {
        manual_token_size?: boolean | undefined;
      };
    };
  }
}

/**
 * Extend the base TokenDocument class to implement system-specific HP bar logic.
 * @extends {TokenDocument}
 */
export class LancerTokenDocument extends TokenDocument {
  _initializeSource(
    ...[data, options]: Parameters<TokenDocument["_initializeSource"]>
  ): ReturnType<TokenDocument["_initializeSource"]> {
    // @ts-expect-error v13 types
    if (this.parent?.grid.isGridless) data.shape ??= CONST.TOKEN_SHAPES.ELLIPSE_1;
    return super._initializeSource(data as any, options);
  }

  async _preCreate(...[data, options, user]: Parameters<TokenDocument["_preCreate"]>) {
    if (
      game.settings.get(game.system.id, LANCER.setting_automation).token_size &&
      // @ts-expect-error Figure out how to define flags
      !this.getFlag(game.system.id, "manual_token_size")
    ) {
      const new_size = Math.max(1, this.actor?.system.size ?? 1);
      this.updateSource({ width: new_size, height: new_size });
    }
    return super._preCreate(data, options, user);
  }

  _onRelatedUpdate(update: any, options: any) {
    super._onRelatedUpdate(update, options);

    if (
      game.settings.get(game.system.id, LANCER.setting_automation).token_size &&
      // @ts-expect-error Figure out how to define flags
      !this.getFlag(game.system.id, "manual_token_size")
    ) {
      let new_size = this.actor ? Math.max(1, this.actor.system.size) : undefined;
      if (this.isOwner && this.id && new_size !== undefined && (this.width !== new_size || this.height !== new_size)) {
        this.update({ width: new_size, height: new_size });
      }
    }
  }

  /**
   * Calculate the range between this and other, accounting for occupied spaces
   * and size
   * @param other   Target to check against
   * @returns The range in grid units.
   */
  computeRange(other: LancerTokenDocument, data: unknown = null, otherData: unknown = null): number {
    const grid = this.parent?.grid ?? canvas.grid;
    if (!grid || !canvas.ready) throw new Error("Canvas not ready");
    if (!this.object || !other.object) throw new Error("Tokens not drawn to canvas");

    if (grid.isGridless) {
      const c2c = grid.measurePath([this.object.center, other.object.center], {}).distance;
      return c2c - (this.width! + other.width!) / 2 + 1;
    } else {
      // @ts-expect-error v13
      const distances = (this.getOccupiedGridSpaceOffsets(data) as BaseGrid.Offset[]).flatMap(s =>
        // @ts-expect-error v13
        (other.getOccupiedGridSpaceOffsets(otherData) as BaseGrid.Offset[]).map(
          t => grid.measurePath([s, t], {}).spaces
        )
      );
      return Math.min(...distances);
    }
  }
}

/**
 * Extend the base Token class to implement additional system-specific logic.
 * @extends {Token}
 */
export class LancerToken extends Token {
  constructor(document: LancerTokenDocument) {
    super(document);
    this._spaces = {
      at: { x: -1, y: -1 },
      spaces: [],
    };
  }

  /**
   * Cached occupied spaces
   */
  protected _spaces: { at: Point; spaces: Point[] };

  /**
   * Returns a Set of Points corresponding to the grid space center points that
   * the token occupies.
   * @deprecated Since v13
   */
  getOccupiedSpaces(): Point[] {
    foundry.utils.logCompatibilityWarning(
      "getOccupiedSpaces is deprecated in favor of the core getOccupiedGridSpaceOffsets",
      { since: 13, until: 14 }
    );
    // @ts-expect-error v13
    return this.document.getOccupiedGridSpaceOffsets()?.map(o => canvas.grid?.getCenterPoint(o));
  }
}

// @ts-expect-error v13 types
export function extendTokenConfig(app: foundry.applications.sheets.TokenConfig, html: HTMLElement) {
  const { token_size } = game.settings.get(game.system.id, LANCER.setting_automation);
  if (!token_size) return;
  const manual = (<LancerTokenDocument>app.token).getFlag(game.system.id, "manual_token_size") ?? false;

  const lock = foundry.applications.fields.createCheckboxInput({
    name: `flags.${game.system.id}.manual_token_size`,
    dataset: { tooltip: "lancer.tokenConfig.manual_token_size.hint" },
    // @ts-expect-error v13 types
    classes: `lock icon ${game.system.id}`,
    value: manual,
  });

  const width = html.querySelector<HTMLInputElement>("input[name=width]");
  const height = html.querySelector<HTMLInputElement>("[name=height]");
  if (!width || !height) return;
  width.closest(".form-group")?.querySelector("label")?.before(lock);

  lock.addEventListener("change", ev => {
    width.disabled = !(ev.currentTarget as HTMLInputElement).checked;
    height.disabled = !(ev.currentTarget as HTMLInputElement).checked;
  });
  width.disabled = !manual;
  height.disabled = !manual;
}
