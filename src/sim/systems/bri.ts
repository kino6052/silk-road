import type { BriEnvelope } from '../../content/types';
const todo = (): never => {
  throw new Error('not implemented');
};
export const BRI_SPENDING_PROFILE: Readonly<Record<number, number>> = {};
export const spendingBn = (_envelope: BriEnvelope, _year: number): number => todo();
export const capitalBn = (_envelope: BriEnvelope, _time: number): number => todo();
export const reliability = (_time: number): number => todo();
