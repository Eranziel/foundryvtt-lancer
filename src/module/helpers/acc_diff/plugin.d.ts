import type * as t from 'io-ts';
import { LancerItem } from "../../item/lancer-item";

import type { AccDiffData } from './index';

declare interface UIBehaviour {
  uiElement: "checkbox",
  slug: string,
  humanLabel: string,
  get uiState(): boolean;
  set uiState(data: boolean): this;
  get disabled(): boolean;
  get visible(): boolean;
}

declare interface RollModifier {
  modifyRoll(roll: string): string
}

declare interface Dehydrated {
  hydrate(data: AccDiffData, target?: AccDiffTarget);
}

export type AccDiffPluginData = UIBehaviour & RollModifier & Dehydrated;

export type AccDiffPluginCodec<C extends AccDiffPluginData, O, I> = Codec<C, O, I>;

declare interface AccDiffPlugin<Data extends AccDiffPluginData> {
  slug: string,
  codec: AccDiffPluginCodec<Data, O, I>,
  perRoll?(item?: LancerItem<any>),
  perUnknownTarget?(): Data,
  perTarget?(item: Token): Data,
}

export type Data<T> = T extends AccDiffPlugin<infer D> ? D : never;
