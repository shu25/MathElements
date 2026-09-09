import type { Expression } from '../ast/types';
import { toLatex } from '../ast/latex';
import type { WorldObject } from '../store/types';
export interface Bounds {
  width: number;
  height: number;
}
export const VECTOR_SCALE = 28;
export const PHYSICS_SCALE = 10;
export function objectSize(n: Expression): Bounds {
  if (n.kind === 'vector')
    return { width: Math.abs(n.x * VECTOR_SCALE) + 40, height: Math.abs(n.y * VECTOR_SCALE) + 48 };
  if (n.kind === 'matrix') return { width: 112, height: 100 };
  if (n.kind === 'quantity' && n.quantity === 'mass') return { width: 70, height: 70 };
  const text = toLatex(n)
    .replace(/\\[a-z]+/g, 'x')
    .replace(/[{}]/g, '');
  return {
    width: Math.max(56, Math.min(650, text.length * 13 + 28)),
    height: n.kind === 'divide' || n.kind === 'derivative' ? 90 : 68,
  };
}
export function freePosition(
  node: Expression,
  point: { x: number; y: number },
  objects: WorldObject[],
  bounds: Bounds = { width: 1200, height: 560 },
): { x: number; y: number } {
  const size = objectSize(node);
  const clamp = (x: number, y: number) => ({
    x: Math.max(size.width / 2 + 12, Math.min(bounds.width - size.width / 2 - 12, x)),
    y: Math.max(size.height / 2 + 16, Math.min(bounds.height - size.height / 2 - 16, y)),
  });
  const valid = (p: { x: number; y: number }) =>
    objects.every((o) => {
      const other = objectSize(o.node);
      return (
        Math.abs(p.x - o.x) > (size.width + other.width) / 2 + 12 ||
        Math.abs(p.y - o.y) > (size.height + other.height) / 2 + 12
      );
    });
  let p = clamp(point.x, point.y);
  if (valid(p)) return p;
  for (let radius = 50; radius < Math.max(bounds.width, bounds.height); radius += 44) {
    for (let i = 0; i < 16; i++) {
      p = clamp(
        point.x + Math.cos((i * Math.PI) / 8) * radius,
        point.y + Math.sin((i * Math.PI) / 8) * radius,
      );
      if (valid(p)) return p;
    }
  }
  return clamp(point.x, point.y);
}
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `element-${Date.now()}-${Math.random().toString(36).slice(2)}`;
