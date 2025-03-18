/**
 * A port of the spell template feature from DnD5e
 * https://gitlab.com/foundrynet/dnd5e/-/blob/master/module/pixi/ability-template.js
 */

import { RangeType } from "../enums";
import { RangeData } from "../models/bits/range";

/**
 * MeasuredTemplate sublcass to create a placeable template on weapon attacks
 * @example
 * ```javascript
 * const template = WeaponRangeTemplate.fromRange({
 *   type: "Cone",
 *   val: "5",
 * });
 * template?.placeTemplate()
 *   .catch(() => {}) // Handle canceled
 *   .then(t => {
 *     if (t) {
 *       // t is a MeasuredTemplate with flag data
 *     }
 * });
 * ```
 */
export class WeaponRangeTemplate extends MeasuredTemplate {
  get range() {
    return this.document.getFlag(game.system.id, "range");
  }

  get isBurst() {
    return this.range.type === RangeType.Burst;
  }

  private actorSheet: FormApplication | undefined;

  /**
   * Creates a new WeaponRangeTemplate from a provided range object
   * @param range      - Range data
   * @param range.type - Type of template. A RangeType in typescript, or a string in js.
   * @param range.val  - Size of template. A numeric string
   * @param creator    - A token that is designated as the owner of the template.
   *                     Used to deterimine the character sheet to close as well
   *                     as a default ignore target for Cones and Lines.
   */
  static fromRange({ type, val }: WeaponRangeTemplate["range"], creator?: Token): WeaponRangeTemplate | null {
    if (!canvas.ready) return null;
    const dist = val;
    if (isNaN(dist)) return null;
    // @ts-expect-error v12
    const square: boolean = canvas.grid?.isSquare;
    const grid_distance = (canvas.scene?.dimensions as Partial<Canvas.Dimensions> | undefined)?.distance ?? 1;

    let shape: "cone" | "ray" | "circle";
    switch (type) {
      case RangeType.Cone:
        shape = "cone";
        break;
      case RangeType.Line:
        shape = "ray";
        break;
      case RangeType.Burst:
      case RangeType.Blast:
        shape = "circle";
        break;
      default:
        return null;
    }

    const templateData = {
      t: shape,
      user: game.user!.id,
      distance: dist * grid_distance,
      width: grid_distance,
      direction: 0,
      x: 0,
      y: 0,
      angle: square ? 51 : 59,
      fillColor: game.user!.color,
      flags: {
        [game.system.id]: {
          range: { type, val },
          creator: creator?.id,
          ignore: {
            tokens: [RangeType.Blast, RangeType.Burst].includes(type) || !creator ? [] : [creator.id],
            dispositions: <TokenDocument["disposition"][]>[],
          },
        },
      },
    };

    const cls = getDocumentClass("MeasuredTemplate");
    const template = new cls(templateData as any, { parent: canvas.scene ?? undefined });
    const object = new this(template);
    // @ts-expect-error Appv2 can't go here be we use appv1 for now
    object.actorSheet = creator?.actor?.sheet ?? undefined;
    return object;
  }

  /**
   * Start placement of the template. Returns immediately, so cannot be used to
   * block until a template is placed.
   * @deprecated Since 1.0
   */
  drawPreview(): void {
    console.warn("WeaponRangeTemplate.drawPreview() is deprecated and has been replaced by placeTemplate()");
    this.placeTemplate().catch(() => {});
  }

  /**
   * Start placement of the template.
   * @returns A Promise that resolves to the final MeasuredTemplateDocument or
   * rejects when creation is canceled or fails.
   */
  placeTemplate(): Promise<MeasuredTemplateDocument> {
    if (!canvas.ready) {
      ui.notifications?.error("Cannot create WeaponRangeTemplate. Canvas is not ready");
      throw new Error("Cannot create WeaponRangeTemplate. Canvas is not ready");
    }
    this.actorSheet?.minimize();
    const initialLayer = canvas.activeLayer;
    this.draw();
    this.layer.activate();
    this.layer.preview?.addChild(this);
    return this.activatePreviewListeners(initialLayer);
  }

  private activatePreviewListeners(initialLayer: CanvasLayer | null): Promise<MeasuredTemplateDocument> {
    return new Promise<MeasuredTemplateDocument>((resolve, reject) => {
      const handlers: any = {};
      let moveTime = 0;

      // Update placement (mouse-move)
      handlers.mm = (event: PIXI.FederatedPointerEvent) => {
        event.stopPropagation();
        let now = Date.now(); // Apply a 20ms throttle
        if (now - moveTime <= 20) return;
        const center = event.getLocalPosition(this.layer);
        let snapped = this.snapToCenter(center);

        if (this.isBurst) snapped = this.snapToToken(center);

        this.document.updateSource({ x: snapped.x, y: snapped.y });
        this.refresh();
        moveTime = now;
      };

      // Cancel the workflow (right-click)
      handlers.rc = (_e: unknown, do_reject: boolean = true) => {
        this.actorSheet?.maximize();
        // Remove the preview
        this.layer.preview?.removeChildren().forEach(c => c.destroy());
        canvas.stage?.off("mousemove", handlers.mm);
        canvas.stage?.off("mousedown", handlers.lc);
        (<HTMLCanvasElement>canvas.app!.view).oncontextmenu = null;
        (<HTMLCanvasElement>canvas.app!.view).onwheel = null;
        // @ts-expect-error Activate should be there but w/e
        initialLayer?.activate();
        if (do_reject) reject(new Error("Template creation cancelled"));
      };

      // Confirm the workflow (left-click)
      handlers.lc = async (event: PIXI.FederatedPointerEvent) => {
        handlers.rc(event, false);
        let destination = this.snapToCenter(event.getLocalPosition(this.layer));
        if (this.isBurst) {
          destination = this.snapToToken(event.getLocalPosition(this.layer));
          const token = this.document.flags[game.system.id].burstToken;
          if (token) {
            const ignore = this.document.flags[game.system.id].ignore.tokens;
            ignore.push(token);
            this.document.updateSource({
              [`flags.${game.system.id}.ignore.tokens`]: ignore,
            });
          }
        }
        this.document.updateSource(destination);
        const template: MeasuredTemplateDocument | undefined = (
          await canvas.scene!.createEmbeddedDocuments("MeasuredTemplate", [this.document.toObject()])
        )?.shift() as any;
        if (template === undefined) {
          reject(new Error("Template creation failed"));
          return;
        }
        // in order to ensure the template is in a useful state, we poll until
        // it's rendered and only then resolve the promise.
        let n_polls = 0;
        const poll = setInterval(() => {
          ++n_polls;
          if (template.object?.shape) {
            clearInterval(poll);
            resolve(template);
          } else if (n_polls >= 100) {
            clearInterval(poll);
            reject(new Error(`Failed to draw template after ${n_polls * 5}ms`));
          }
        }, 5);
      };

      // Rotate the template by 3 degree increments (mouse-wheel)
      handlers.mw = (event: WheelEvent) => {
        if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
        event.stopPropagation();
        let delta = canvas.grid!.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
        let snap = event.shiftKey ? delta : 5;
        this.document.updateSource({ direction: this.document.direction + snap * Math.sign(event.deltaY) });
        this.refresh();
      };

      // Activate listeners
      canvas.stage!.on("mousemove", handlers.mm);
      canvas.stage!.on("mousedown", handlers.lc);
      //@ts-expect-error
      canvas.app!.view.oncontextmenu = handlers.rc;
      //@ts-expect-error
      canvas.app!.view.onwheel = handlers.mw;
    });
  }

  /**
   * Snapping function to only snap to the center of spaces rather than corners.
   */
  private snapToCenter({ x, y }: { x: number; y: number }): { x: number; y: number } {
    const snapped = canvas.grid!.getCenterPoint({ x, y });
    return snapped;
  }

  /**
   * Snapping function to snap to the center of a hovered token. Also resizes
   * the template for bursts.
   */
  private snapToToken({ x, y }: { x: number; y: number }): { x: number; y: number } {
    const token = canvas
      .tokens!.placeables.filter(t => {
        // test if cursor is inside token
        return t.x < x && t.x + t.w > x && t.y < y && t.y + t.h > y;
      })
      .reduce((r: Token | null, t) => {
        // skip hidden tokens
        if (!t.visible) return r;
        // use the token that is closest.
        if (
          r === null ||
          r === undefined ||
          // @ts-expect-error v12
          canvas.grid!.measurePath([{ x, y }, t.center]) < canvas.grid!.measurePath([{ x, y }, r.center])
        )
          return t;
        else return r;
      }, null);
    if (token) {
      this.document.updateSource({
        // @ts-expect-error v10
        distance: this.getBurstDistance(token.document.width),
        [`flags.${game.system.id}.burstToken`]: token.id,
      });
      return token.center;
    } else {
      this.document.updateSource({ distance: this.getBurstDistance(1) });
      return this.snapToCenter({ x, y });
    }
  }

  /**
   * Get fine-tuned sizing data for Burst templates
   */
  private getBurstDistance(size: number): number {
    return (<RangeData>this.range).val + size / 2;
  }
}

declare global {
  interface FlagConfig {
    MeasuredTemplate: {
      lancer: {
        range: RangeData;
        creator?: string;
        burstToken?: string;
        ignore: { tokens: string[]; dispositions: TokenDocument["disposition"][] };
        isAttack?: boolean;
      };
    };
  }
}
