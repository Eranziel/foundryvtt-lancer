import { LANCER } from "./config";

import BaseGrid = foundry.grid.BaseGrid;
type Point = Canvas.Point;

declare module "fvtt-types/configuration" {
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
 */
export class LancerTokenDocument extends TokenDocument {
  _initializeSource(
    data: TokenDocument.CreateData,
    options: foundry.abstract.DataModel.InitializeSourceOptions
  ): TokenDocument.Source {
    if (this.parent?.grid.isGridless) data.shape ??= CONST.TOKEN_SHAPES.ELLIPSE_1;
    return super._initializeSource(data, options);
  }

  protected override _preCreate(
    data: TokenDocument.CreateData,
    options: TokenDocument.Database.PreCreateOptions,
    user: User.Implementation
  ): Promise<boolean | void> {
    if (
      game.settings.get(game.system.id, LANCER.setting_automation).token_size &&
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
      !this.getFlag(game.system.id, "manual_token_size")
    ) {
      let new_size = this.actor ? Math.max(1, this.actor.system.size) : undefined;
      if (this.isOwner && this.id && new_size !== undefined && (this.width !== new_size || this.height !== new_size)) {
        this.update({ width: new_size, height: new_size });
      }
    }
  }

  testInsideRegion(
    region: foundry.documents.RegionDocument,
    data: Partial<Canvas.ElevatedPoint & TokenDocument.Dimensions> = {}
  ): boolean {
    // Override region containment logic to look at all occupied spaces instead of just the centerpoint
    // This is improved in v14 and can be replaced then
    if (!this.parent || this.parent !== region.parent)
      throw new Error("The Token and the Region must be in the same Scene");
    if (this.parent.grid.isGridless) return super.testInsideRegion(region, data);
    // @ts-expect-error shape is typed as number in one place but more specific elsewhere
    const spaces = this.getOccupiedGridSpaceOffsets({
      ...this._source,
      ...data,
    });
    const inside = spaces.some(s => {
      const point: Canvas.ElevatedPoint = this.parent!.grid.getCenterPoint(s) as Canvas.ElevatedPoint;
      point.elevation = data.elevation ?? this._source.elevation;
      return region.testPoint(point);
    });
    return inside;
  }

  segmentizeRegionMovementPath(
    region: foundry.documents.RegionDocument,
    waypoints: TokenDocument.SegmentizeMovementWaypoint[]
  ): RegionDocument.MovementSegment[] {
    // Override region containment logic to look at all occupied spaces instead of just the centerpoint
    // This is improved in v14 and can be replaced then
    if (!this.parent || this.parent !== region.parent)
      throw new Error("The Token and the Region must be in the same Scene");
    if (this.parent.grid.isGridless) return super.segmentizeRegionMovementPath(region, waypoints);
    if (waypoints.length <= 1) return [];
    const segments = [];
    const source = this._source;
    let {
      x = source.x,
      y = source.y,
      elevation = source.elevation,
      width: previousWidth = source.width,
      height: previousHeight = source.height,
      shape: previousShape = source.shape,
      action: previousAction = this.movementAction,
    } = waypoints[0];
    let from = { x, y, elevation };
    for (let i = 1; i < waypoints.length; i++) {
      let {
        x = from.x,
        y = from.y,
        elevation = from.elevation,
        width = previousWidth,
        height = previousHeight,
        shape = previousShape,
        action = previousAction,
        terrain = null,
        snapped = false,
      } = waypoints[i];
      x = Math.round(x);
      y = Math.round(y);
      const to = {
        x,
        y,
        elevation,
        teleport: CONFIG.Token.movement.actions[action!].teleport,
      };
      const pivot = this.getCenterPoint({
        x: 0,
        y: 0,
        elevation,
        width,
        height,
        // @ts-expect-error shape is typed as number in one place but more specific elsewhere
        shape,
      });
      const snap_offset = this.getSnappedPosition({ x: 0, y: 0 });
      const samples = this.getOccupiedGridSpaceOffsets({
        x: 0,
        y: 0,
        elevation,
        width,
        height,
        // @ts-expect-error shape is typed as number in one place but more specific elsewhere
        shape,
      }).map(o => {
        const p = this.parent!.grid.getCenterPoint(o);
        return { x: p.x - snap_offset.x, y: p.y - snap_offset.y };
      });

      if (width !== previousWidth || height !== previousHeight || shape !== previousShape) {
        const center = this.getCenterPoint({
          x: from.x,
          y: from.y,
          elevation: from.elevation,
          width: previousWidth,
          height: previousHeight,
          // @ts-expect-error shape is typed as number in one place but more specific elsewhere
          shape: previousShape,
        });
        from.x = Math.round(center.x - pivot.x);
        from.y = Math.round(center.y - pivot.y);
        from.elevation = center.elevation - pivot.elevation;
      }

      for (const segment of region.segmentizeMovementPath([from, to], samples)) {
        // @ts-expect-error Valid, and what foundry core does
        delete segment.teleport;
        // @ts-expect-error
        segment.action = action;
        // @ts-expect-error
        segment.terrain = terrain ? terrain.clone() : null;
        // @ts-expect-error
        segment.snapped = snapped;
        const { from, to } = segment;
        // @ts-expect-error
        from.width = width;
        // @ts-expect-error
        from.height = height;
        // @ts-expect-error
        from.shape = shape;
        // @ts-expect-error
        to.width = width;
        // @ts-expect-error
        to.height = height;
        // @ts-expect-error
        to.shape = shape;
        segments.push(segment);
      }

      from = to;
      previousWidth = width;
      previousHeight = height;
      previousShape = shape;
      previousAction = action;
    }
    return segments;
  }

  /**
   * Calculate the range between this and other, accounting for occupied spaces
   * and size
   * @param other   Target to check against
   * @returns The range in grid units.
   */
  computeRange(other: LancerTokenDocument, data: unknown = {}, otherData: unknown = {}): number {
    const grid = this.parent?.grid ?? canvas.grid;
    if (!grid || !canvas.ready) throw new Error("Canvas not ready");
    if (!this.object || !other.object) throw new Error("Tokens not drawn to canvas");

    if (grid.isGridless) {
      const c2c = grid.measurePath([this.object.center, other.object.center], {}).distance;
      return c2c - (this.width! + other.width!) / 2 + 1;
    } else {
      const distances = (this.getOccupiedGridSpaceOffsets(data) as BaseGrid.Offset[]).flatMap(s =>
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
 */
export class LancerToken extends foundry.canvas.placeables.Token {
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
    return this.document
      .getOccupiedGridSpaceOffsets()
      ?.map(o => canvas.grid?.getCenterPoint(o))
      .filter(p => p != null);
  }
}

export function extendTokenConfig(app: foundry.applications.sheets.TokenConfig, html: HTMLElement) {
  const { token_size } = game.settings.get(game.system.id, LANCER.setting_automation);
  if (!token_size) return;
  const manual = (<LancerTokenDocument>app.token).getFlag(game.system.id, "manual_token_size") ?? false;

  const lock = foundry.applications.fields.createCheckboxInput({
    name: `flags.${game.system.id}.manual_token_size`,
    dataset: { tooltip: "lancer.tokenConfig.manual_token_size.hint" },
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
