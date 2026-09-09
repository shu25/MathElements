import type { PhysicsQuantityNode, VectorNode, MatrixNode } from '../ast/types';
import { vector } from '../ast/types';

export interface BodyConfig {
  mass: number;
  speed: number;
  angle: number;
  gravity: number;
  forceX: number;
  forceY: number;
}
export interface MotionState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  ax: number;
  ay: number;
  time: number;
  landed: boolean;
}
export const defaultBody = (): BodyConfig => ({
  mass: 1,
  speed: 0,
  angle: 45,
  gravity: 0,
  forceX: 0,
  forceY: 0,
});
export function isBody(value: unknown): value is BodyConfig {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    ['mass', 'speed', 'angle', 'gravity', 'forceX', 'forceY'].every(
      (k) => typeof v[k] === 'number' && Number.isFinite(v[k]) && Math.abs(v[k] as number) <= 10000,
    ) &&
    (v.mass as number) > 0 &&
    (v.speed as number) >= 0 &&
    (v.gravity as number) >= 0
  );
}
export function motionAt(body: BodyConfig, time: number, groundY = 0): MotionState {
  const angle = (body.angle * Math.PI) / 180;
  const ux = body.speed * Math.cos(angle),
    uy = body.speed * Math.sin(angle);
  const ax = body.forceX / body.mass,
    ay = body.forceY / body.mass - body.gravity;
  // Coordinates are measured from the release point; the floor may lie below it.
  const floor = Math.min(0, groundY);
  if (floor === 0 && uy <= 0 && ay <= 0) {
    const t = Math.max(0, time),
      vx = ux + ax * t;
    return {
      x: ux * t + (ax * t * t) / 2,
      y: 0,
      vx,
      vy: 0,
      speed: Math.abs(vx),
      ax,
      ay: 0,
      time: t,
      landed: false,
    };
  }
  const discriminant = uy * uy + 2 * ay * floor;
  const flightTime =
    ay < 0 && discriminant >= 0
      ? (-uy - Math.sqrt(discriminant)) / ay
      : ay === 0 && uy < 0
        ? floor / uy
        : Infinity;
  const t = Math.min(Math.max(time, 0), flightTime);
  const vx = ux + ax * t,
    vy = uy + ay * t;
  const landed = time > 0 && time >= flightTime;
  return {
    x: ux * t + (ax * t * t) / 2,
    y: landed ? floor : Math.max(floor, uy * t + (ay * t * t) / 2),
    vx,
    vy,
    speed: Math.hypot(vx, vy),
    ax,
    ay,
    time: t,
    landed,
  };
}
export function applyQuantity(body: BodyConfig, q: PhysicsQuantityNode): BodyConfig {
  const a = (q.angle * Math.PI) / 180;
  switch (q.quantity) {
    case 'mass':
      return { ...body, mass: Math.max(0.01, q.value) };
    case 'force':
      return {
        ...body,
        forceX: body.forceX + q.value * Math.cos(a),
        forceY: body.forceY + q.value * Math.sin(a),
      };
    case 'acceleration':
      return {
        ...body,
        forceX: q.value * Math.cos(a) * body.mass,
        forceY: q.value * Math.sin(a) * body.mass,
      };
    case 'velocity':
      return { ...body, speed: Math.max(0, q.value), angle: q.angle };
    case 'gravity':
      return { ...body, gravity: Math.max(0, q.value) };
    default:
      return body;
  }
}
export const addVectors = (a: VectorNode, b: VectorNode): VectorNode =>
  vector(a.x + b.x, a.y + b.y);
export const transformVector = (m: MatrixNode, v: VectorNode): VectorNode =>
  vector(m.values[0][0] * v.x + m.values[0][1] * v.y, m.values[1][0] * v.x + m.values[1][1] * v.y);
