import { type FoundryDropData } from "../helpers/dragdrop";
import { LancerItem } from "../item/lancer-item";

export function dropStatusToCanvas(canvas: Canvas, data: FoundryDropData): void | false {
  if (!("uuid" in data) || !("type" in data) || data.type !== "Item") return;

  const { x, y } = data;
  if (typeof x !== "number" || typeof y !== "number") return;

  const doc = fromUuidSync(data.uuid);
  if (!doc || !("type" in doc) || doc.type !== "status") return;

  const rect = new PIXI.Rectangle(x, y, 0, 0);
  const tokens: Set<Token.Implementation> = canvas.tokens!.quadtree!.getObjects(rect, {
    collisionTest: o => o.t.hitArea!.contains(x - o.t.x, y - o.t.y),
  }) as any;
  if (tokens.size !== 1 || !tokens.first()?.actor?.isOwner) return;

  LancerItem.fromDropData(data as any).then(i => tokens.first()?.actor?.createEmbeddedDocuments("Item", [i! as any]));
  // If we get here, we've succeeded and don't want other handlers to run
  return false;
}
