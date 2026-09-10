import type { PhysicsQuantityNode, VectorNode, MatrixNode } from '../ast/types';
import { vector } from '../ast/types';

export interface BodyConfig {
  mass: number;
  speed: number;
  angle: number;
  gravity: number;
  forceX: number;
  forceY: number;
  friction?: number;
  drag?: number;
  lift?: number;
  density?: number;
  area?: number;
  displacedVolume?: number;
  windX?: number;
  windY?: number;
  restitution?: number;
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
    (v.gravity as number) >= 0 &&
    Object.entries({
      friction: [0, 2],
      drag: [0, 5],
      lift: [-5, 5],
      density: [0, 2000],
      area: [0, 100],
      displacedVolume: [0, 10],
      windX: [-100, 100],
      windY: [-100, 100],
      restitution: [0, 1],
    }).every(
      ([k, [min, max]]) =>
        v[k] === undefined ||
        (typeof v[k] === 'number' &&
          Number.isFinite(v[k]) &&
          (v[k] as number) >= min &&
          (v[k] as number) <= max),
    )
  );
}
export function motionAt(body: BodyConfig, time: number, groundY = 0): MotionState {
  if (body.friction || body.drag || body.lift || body.displacedVolume || body.restitution)
    return fluidMotionAt(body, time, groundY);
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
    case 'friction':
      return { ...body, friction: Math.max(0, Math.min(2, q.value)) };
    case 'drag':
      return { ...body, drag: Math.max(0, Math.min(5, q.value)) };
    case 'lift':
      return { ...body, lift: Math.max(-5, Math.min(5, q.value)) };
    case 'buoyancy':
      return { ...body, displacedVolume: Math.max(0, Math.min(10, q.value)), density: 1000 };
    case 'wind':
      return {
        ...body,
        windX: Math.max(-100, Math.min(100, q.value * Math.cos(a))),
        windY: Math.max(-100, Math.min(100, q.value * Math.sin(a))),
      };
    case 'bounce':
      return { ...body, restitution: Math.max(0, Math.min(1, q.value)) };
    default:
      return body;
  }
}

export const SIMULATION_DURATION = 120;
const DT = 1 / 240;
// Fixed-step samples are shared by animation and trajectory drawing, including paused scrubbing.
const trajectories = new WeakMap<BodyConfig, { floor: number; samples: MotionState[] }>();
export function fluidForces(body: BodyConfig, vx: number, vy: number) {
  const rx = vx - (body.windX ?? 0),
    ry = vy - (body.windY ?? 0);
  const speed = Math.hypot(rx, ry);
  const pressure = 0.5 * (body.density ?? 1.225) * (body.area ?? 0.1) * speed;
  return {
    dragX: -pressure * (body.drag ?? 0) * rx,
    dragY: -pressure * (body.drag ?? 0) * ry,
    liftX: -pressure * (body.lift ?? 0) * ry,
    liftY: pressure * (body.lift ?? 0) * rx,
    buoyancy: (body.density ?? 1.225) * (body.displacedVolume ?? 0) * body.gravity,
  };
}
function advance(body: BodyConfig, p: MotionState, dt: number, floor: number): MotionState {
  const f = fluidForces(body, p.vx, p.vy);
  const fy = body.forceY + f.buoyancy - body.mass * body.gravity;
  let vx = p.vx + (body.forceX / body.mass) * dt;
  let vy = p.vy + (fy / body.mass) * dt;
  const wx = body.windX ?? 0,
    wy = body.windY ?? 0;
  let rx = vx - wx,
    ry = vy - wy;
  const k = (0.5 * (body.density ?? 1.225) * (body.area ?? 0.1)) / body.mass;
  // Exact drag decay and a rotation for lift keep dissipative forces from adding energy.
  const damping = 1 + k * (body.drag ?? 0) * Math.hypot(rx, ry) * dt;
  rx /= damping;
  ry /= damping;
  const angle = k * (body.lift ?? 0) * Math.hypot(rx, ry) * dt;
  vx = wx + rx * Math.cos(angle) - ry * Math.sin(angle);
  vy = wy + rx * Math.sin(angle) + ry * Math.cos(angle);
  const onFloor = p.y <= floor + 1e-8 && p.vy <= 1e-8;
  if (onFloor && vy <= 0) {
    const normal = Math.max(0, -(fy + f.dragY + f.liftY));
    const reduction = (((body.friction ?? 0) * normal) / body.mass) * dt;
    vx = Math.sign(vx) * Math.max(0, Math.abs(vx) - reduction);
    vy = 0;
  }
  let y = p.y + ((p.vy + vy) * dt) / 2;
  if (y < floor) {
    y = floor;
    vy = Math.abs(vy) * (body.restitution ?? 0);
    if (vy < 0.05) vy = 0;
  }
  return {
    x: p.x + ((p.vx + vx) * dt) / 2,
    y,
    vx,
    vy,
    speed: Math.hypot(vx, vy),
    ax: (vx - p.vx) / dt,
    ay: (vy - p.vy) / dt,
    time: p.time + dt,
    landed: y <= floor && Math.abs(vx) < 1e-6 && vy === 0,
  };
}
function fluidMotionAt(body: BodyConfig, time: number, groundY: number): MotionState {
  const floor = Math.min(0, groundY),
    t = Math.min(SIMULATION_DURATION, Math.max(0, time));
  let cache = trajectories.get(body);
  if (!cache || cache.floor !== floor) {
    const angle = (body.angle * Math.PI) / 180;
    cache = {
      floor,
      samples: [
        {
          x: 0,
          y: 0,
          vx: body.speed * Math.cos(angle),
          vy: body.speed * Math.sin(angle),
          speed: body.speed,
          ax: 0,
          ay: 0,
          time: 0,
          landed: false,
        },
      ],
    };
    trajectories.set(body, cache);
  }
  const index = Math.floor(t / DT);
  while (cache.samples.length <= index)
    cache.samples.push(advance(body, cache.samples[cache.samples.length - 1], DT, floor));
  const p = cache.samples[index],
    rest = t - index * DT;
  return rest > 1e-10 ? advance(body, p, rest, floor) : p;
}
export const addVectors = (a: VectorNode, b: VectorNode): VectorNode =>
  vector(a.x + b.x, a.y + b.y);
export const transformVector = (m: MatrixNode, v: VectorNode): VectorNode =>
  vector(m.values[0][0] * v.x + m.values[0][1] * v.y, m.values[1][0] * v.x + m.values[1][1] * v.y);
