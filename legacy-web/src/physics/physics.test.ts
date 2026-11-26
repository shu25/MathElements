import { describe, expect, it } from 'vitest';
import { applyQuantity, defaultBody, isBody, motionAt } from './model';
import { quantity } from '../ast/types';

describe('Newtonian motion', () => {
  it('uses F=ma with mass in kilograms', () => {
    const body = applyQuantity({ ...defaultBody(), mass: 2 }, quantity('force', 10));
    const p = motionAt(body, 3);
    expect(p.ax).toBe(5);
    expect(p.vx).toBe(15);
    expect(p.x).toBe(22.5);
  });
  it('adds force vectors instead of replacing the net force', () => {
    const body = applyQuantity(
      applyQuantity(defaultBody(), quantity('force', 5)),
      quantity('force', 5, 90),
    );
    expect(body.forceX).toBeCloseTo(5);
    expect(body.forceY).toBeCloseTo(5);
  });
  it('computes projectile motion and the exact ground intersection', () => {
    const body = { ...defaultBody(), speed: 20, angle: 45, gravity: 9.81 };
    const p = motionAt(body, 1);
    expect(p.x).toBeCloseTo(Math.sqrt(200), 10);
    expect(p.y).toBeCloseTo(Math.sqrt(200) - 4.905, 10);
    const landed = motionAt(body, 5);
    expect(landed.landed).toBe(true);
    expect(landed.y).toBeCloseTo(0, 10);
    expect(landed.x).toBeCloseTo(400 / 9.81, 10);
  });
  it('rejects corrupted physical states', () => {
    expect(isBody({ ...defaultBody(), mass: 0 })).toBe(false);
    expect(isBody({ ...defaultBody(), gravity: NaN })).toBe(false);
  });
  it('falls from a raised release point to the actual ground', () => {
    const p = motionAt({ ...defaultBody(), gravity: 9.81 }, 10, -12);
    expect(p.y).toBe(-12);
    expect(p.time).toBeCloseTo(Math.sqrt(24 / 9.81), 10);
    expect(p.landed).toBe(true);
  });
  it('supports horizontal acceleration on the floor while gravity is balanced', () => {
    const p = motionAt({ ...defaultBody(), gravity: 9.81, forceX: 4, mass: 2 }, 3);
    expect(p.x).toBe(9);
    expect(p.y).toBe(0);
    expect(p.ay).toBe(0);
  });
});
