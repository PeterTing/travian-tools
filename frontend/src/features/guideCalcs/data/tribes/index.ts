import type { Tribe, TribeId } from '../tribes-types';
import { romans } from './romans';
import { gauls } from './gauls';
import { teutons } from './teutons';
import { egyptians } from './egyptians';
import { huns } from './huns';
import { vikings } from './vikings';
import { spartans } from './spartans';

export const TRIBES: Record<TribeId, Tribe> = {
  romans, gauls, teutons, egyptians, huns, vikings, spartans,
};

export const TRIBE_ORDER: TribeId[] = [
  'romans', 'gauls', 'teutons', 'egyptians', 'huns', 'vikings', 'spartans',
];

export const TRIBE_LIST: Tribe[] = TRIBE_ORDER.map(id => TRIBES[id]);

export function getTribe(id: string): Tribe | undefined {
  return (TRIBES as Record<string, Tribe>)[id];
}
