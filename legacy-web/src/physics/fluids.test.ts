import { describe, expect, it } from 'vitest';
import { applyQuantity, defaultBody, fluidForces, isBody, motionAt } from './model';
import { quantity, vector } from '../ast/types';
import { useGameStore } from '../store/useGameStore';
import { isScene } from '../store/persistence';

describe('friction and fluid motion', () => {
  it('stops at the Coulomb friction stopping distance without reversing', () => {
    const b = { ...defaultBody(), speed: 10, angle: 0, gravity: 10, friction: 0.5 };
    const p = motionAt(b, 5);
    expect(p.vx).toBe(0);
    expect(p.x).toBeCloseTo(10, 2);
    expect(p.y).toBe(0);
  });
  it('balances static friction and slides above the threshold', () => {
    expect(motionAt({ ...defaultBody(), gravity: 10, friction: 0.5, forceX: 4 }, 2).x).toBe(0);
    expect(motionAt({ ...defaultBody(), gravity: 10, friction: 0.5, forceX: 6 }, 2).x).toBeCloseTo(
      2,
      2,
    );
  });
  it('matches quadratic drag decay and cannot accelerate past still air', () => {
    const b = { ...defaultBody(), speed: 10, angle: 0, drag: 1, area: 1, density: 2 };
    expect(motionAt(b, 1, -100).vx).toBeCloseTo(10 / 11, 5);
    expect(motionAt(b, 20, -100).vx).toBeGreaterThan(0);
  });
  it('uses relative wind and lift is perpendicular to it', () => {
    const b = { ...defaultBody(), windX: 3, windY: 2, drag: 1, lift: 0.6 };
    const f = fluidForces(b, 9, 6);
    expect(f.liftX * 6 + f.liftY * 4).toBeCloseTo(0);
    expect(fluidForces(b, 3, 2).dragX).toBeCloseTo(0);
    expect(motionAt({ ...b, speed: 0 }, 1, -100).vx).toBeGreaterThan(0);
  });
  it('raises a rightward-moving body without adding kinetic energy from lift', () => {
    const p = motionAt({ ...defaultBody(), speed: 10, angle: 0, lift: 0.6 }, 0.5, -100);
    expect(p.y).toBeGreaterThan(0);
    expect(p.speed).toBeCloseTo(10, 6);
  });
  it('supports neutral buoyancy and net upward acceleration', () => {
    const b = { ...defaultBody(), gravity: 10, density: 1000, displacedVolume: 0.001 };
    expect(motionAt(b, 2, -100).y).toBeCloseTo(0);
    expect(motionAt({ ...b, displacedVolume: 0.002 }, 1, -100).y).toBeCloseTo(5, 4);
  });
  it('rebounds from the floor and reduces impact speed', () => {
    const p = motionAt({ ...defaultBody(), gravity: 10, restitution: 0.8 }, 0.6, -1);
    expect(p.y).toBeGreaterThan(-1);
    expect(p.vy).toBeGreaterThan(0);
  });
  it('reuses deterministic samples for earlier trajectory times', () => {
    const b = { ...defaultBody(), drag: 0.47, speed: 12, gravity: 9.81 };
    const before = motionAt(b, 0.75, -20);
    motionAt(b, 8, -20);
    expect(motionAt(b, 0.75, -20)).toEqual(before);
  });
  it('validates optional parameters while accepting old saves', () => {
    expect(isBody(defaultBody())).toBe(true);
    expect(isBody({ ...defaultBody(), friction: -1 })).toBe(false);
    expect(isBody({ ...defaultBody(), restitution: 2 })).toBe(false);
    expect(isBody({ ...defaultBody(), density: NaN })).toBe(false);
    expect(applyQuantity(defaultBody(), quantity('buoyancy', 0.002))).toMatchObject({
      density: 1000,
      displacedVolume: 0.002,
    });
  });
  it('rotates vector components, duplicates and restores through undo with valid saves', () => {
    useGameStore.setState({
      scene: { objects: [{ id: 'v', x: 200, y: 200, node: vector(3, 0) }], grid: null },
      past: [],
      future: [],
      mode: 'sandbox',
    });
    const s = useGameStore.getState();
    s.rotateObject('v', 90);
    expect(useGameStore.getState().scene.objects[0].node).toEqual(vector(0, 3));
    s.duplicate('v');
    expect(useGameStore.getState().scene.objects).toHaveLength(2);
    expect(isScene(useGameStore.getState().scene)).toBe(true);
    s.undo();
    s.undo();
    expect(useGameStore.getState().scene.objects[0].node).toEqual(vector(3, 0));
  });
});
