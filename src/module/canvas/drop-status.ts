import { LancerItem } from "../item/lancer-item";

export function dropStatusToCanvas(
  canvas: Canvas,
  data: { type: string; uuid: string; x: number; y: number }
): void | false {
  // @ts-expect-error
  const type: string | undefined = fromUuidSync(data.uuid)?.type;
  if (data.type !== "Item" || type !== "status") return;
  const rect = new PIXI.Rectangle(data.x, data.y, 0, 0);
  const tokens: Set<Token> = canvas.tokens!.quadtree!.getObjects(rect, {
    collisionTest: o => o.t.hitArea!.contains(data.x - o.t.x, data.y - o.t.y),
  }) as any;
  if (tokens.size !== 1 || !tokens.first()?.actor?.isOwner) return;
  LancerItem.fromDropData(data as any).then(i => tokens.first()?.actor?.createEmbeddedDocuments("Item", [i! as any]));
  // If we get here, we've succeeded and don't want other handlers to run
  return false;
}
