import type { Expression, MatrixNode, VectorNode } from '../ast/types';
import type { BodyConfig } from '../physics/model';

export interface WorldObject {
  id: string;
  node: Expression;
  x: number;
  y: number;
  rotation?: number;
  body?: BodyConfig;
  vectorParts?: [VectorNode, VectorNode];
}
export interface Scene {
  objects: WorldObject[];
  grid: MatrixNode | null;
}
export type Domain = 'math' | 'physics';
export type Mode = 'sandbox' | 'challenges';
export interface Settings {
  muted: boolean;
  trails: boolean;
}
export const emptyScene = (): Scene => ({ objects: [], grid: null });
