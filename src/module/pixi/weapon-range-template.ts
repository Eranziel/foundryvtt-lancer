/**
 * A port of the spell template feature from DnD5e
 * https://gitlab.com/foundrynet/dnd5e/-/blob/master/module/pixi/ability-template.js
 */

import { RangeType, RegRangeData } from "machine-mind";

declare global {
  interface FlagConfig {
    MeasuredTemplate: {
      [game.system.id]: {
        range: RegRangeData;
        creator?: string;
        ignore: {
          tokens: string[];
          dispositions: TokenDocument["data"]["disposition"][];
        };
      };
    };
  }
}

/**
 * MeasuredTemplate sublcass to create a placeable template on weapon attacks
 * @extends MeasuredTemplate
 * @example
 * ```
 * WeaponRangeTemplate.fromRange({
 *     type: 'Cone',
 *     val: "5",
 * }).drawPreview();
 * ```
 */
export class WeaponRangeTemplate extends MeasuredTemplate {
  get range() {
    return this.document.getFlag("lancer", "range");
  }

  get isBurst() {
    return this.range.type === RangeType.Burst;
  }

  /**
   * Creates a new WeaponRangeTemplate from a provided range object
   * @param type Type of template
   * @param val Size of template
   */
  static fromRange({ type, val }: WeaponRangeTemplate["range"], creator?: Token): WeaponRangeTemplate | null {
    if (!canvas.ready) return null;
    let dist = parseInt(val);
    let hex: boolean = (canvas.grid?.type ?? 0) >= 2;

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

    const scale = hex ? Math.sqrt(3) / 2 : 1;
    const templateData = {
      t: shape,
      user: game.user!.id,
      distance: (dist + 0.1) * scale,
      width: scale,
      direction: 0,
      x: 0,
      y: 0,
      angle: 58,
      fillColor: game.user!.data.color,
      flags: {
        [game.system.id]: {
          range: { type, val },
          creator: creator?.id,
          ignore: {
            tokens: type === RangeType.Blast || !creator ? [] : [creator.id],
            dispositions: <TokenDocument["data"]["disposition"][]>[],
          },
        },
      },
    };

    const cls = CONFIG.MeasuredTemplate.documentClass;
    const template = new cls(templateData, { parent: canvas.scene ?? undefined });
    const object = new this(template);
    return object;
  }

  /**
   * Start placement of the template. Returns a promise that resolves to the
   * final MeasuredTemplateDocument or rejects when creation is canceled or
   * fails.
   */
  drawPreview(): Promise<MeasuredTemplateDocument> {
    if (!canvas.ready) {
      ui.notifications?.error("Cannot create WeaponRangeTemplate. Canvas is not ready");
      throw new Error("Cannot create WeaponRangeTemplate. Canvas is not ready");
    }
    const initialLayer = canvas.activeLayer;
    this.draw();
    this.layer.activate();
    this.layer.preview?.addChild(this);
    return this.activatePreviewListeners(initialLayer);
  }

  activatePreviewListeners(initialLayer: CanvasLayer<CanvasLayerOptions> | null): Promise<MeasuredTemplateDocument> {
    return new Promise<MeasuredTemplateDocument>((resolve, reject) => {
      const handlers: any = {};
      let moveTime = 0;

      // Update placement (mouse-move)
      handlers.mm = (event: PIXI.InteractionEvent) => {
        event.stopPropagation();
        let now = Date.now(); // Apply a 20ms throttle
        if (now - moveTime <= 20) return;
        const center = event.data.getLocalPosition(this.layer);
        let snapped = this.snapToCenter(center);

        if (this.isBurst) snapped = this.snapToToken(center);

        this.data.update({ x: snapped.x, y: snapped.y });
        this.refresh();
        moveTime = now;
      };

      // Cancel the workflow (right-click)
      handlers.rc = (_e: unknown, do_reject: boolean = true) => {
        // Remove the preview
        this.layer.preview?.removeChildren().forEach(c => c.destroy());
        canvas.stage?.off("mousemove", handlers.mm);
        canvas.stage?.off("mousedown", handlers.lc);
        canvas.app!.view.oncontextmenu = null;
        canvas.app!.view.onwheel = null;
        initialLayer?.activate();
        if (do_reject) reject("Template creation cancelled");
      };

      // Confirm the workflow (left-click)
      handlers.lc = async (event: PIXI.InteractionEvent) => {
        handlers.rc(event, false);
        let destination = this.snapToCenter(event.data.getLocalPosition(this.layer));
        if (this.isBurst) destination = this.snapToToken(event.data.getLocalPosition(this.layer));
        this.data.update(destination);
        const template = (<MeasuredTemplateDocument[]>(
          await canvas.scene!.createEmbeddedDocuments("MeasuredTemplate", [this.data.toObject()])
        )).shift();
        if (template === undefined) {
          reject("Template creation failed");
          return;
        }
        resolve(template);
      };

      // Rotate the template by 3 degree increments (mouse-wheel)
      handlers.mw = (event: WheelEvent) => {
        if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
        event.stopPropagation();
        let delta = canvas.grid!.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
        let snap = event.shiftKey ? delta : 5;
        this.data.update({ direction: this.data.direction + snap * Math.sign(event.deltaY) });
        this.refresh();
      };

      // Activate listeners
      canvas.stage!.on("mousemove", handlers.mm);
      canvas.stage!.on("mousedown", handlers.lc);
      canvas.app!.view.oncontextmenu = handlers.rc;
      canvas.app!.view.onwheel = handlers.mw;
    });
  }

  /**
   * Snapping function to only snap to the center of spaces rather than corners.
   */
  snapToCenter({ x, y }: { x: number; y: number }): { x: number; y: number } {
    const snapped = canvas.grid!.getCenter(x, y);
    return { x: snapped[0], y: snapped[1] };
  }

  /**
   * Snapping function to snap to the center of a hovered token. Also resizes
   * the template for bursts.
   */
  snapToToken({ x, y }: { x: number; y: number }): { x: number; y: number } {
    const token = canvas
      .tokens!.placeables.filter((t: any) => {
        // test if cursor is inside token
        return t.x < x && t.x + t.w > x && t.y < y && t.y + t.h > y;
      })
      .reduce((r: any | null, t: any) => {
        // skip hidden tokens
        if (!t.visible) return r;
        // use the token that is closest.
        if (
          r === null ||
          r === undefined ||
          canvas.grid!.measureDistance({ x, y }, t.center) < canvas.grid!.measureDistance({ x, y }, r.center)
        )
          return t;
        else return r;
      }, null);
    if (token) {
      this.data.update({ distance: this.getBurstDistance(token.data.width) });
      return token.center;
    } else {
      this.data.update({ distance: this.getBurstDistance(1) });
      return this.snapToCenter({ x, y });
    }
  }

  /**
   * Get fine-tuned sizing data for Burst templates
   */
  getBurstDistance(size: number): number {
    const hex = canvas.grid!.type > 1;
    const scale = hex ? Math.sqrt(3) / 2 : 1;
    let val = parseInt(this.range.val);
    if (hex) {
      if (size === 2) val += 0.7 - (val > 2 ? 0.1 : 0);
      if (size === 3) val += 1.2;
      if (size === 4) val += 1.5;
    } else {
      if (size === 2) val += 0.9;
      if (size === 3) val += 1.4;
      if (size === 4) val += 1.9;
    }
    return (val + 0.1) * scale;
  }
}
