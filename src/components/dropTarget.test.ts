import { describe, expect, it } from 'vitest';
import { hitScore } from './dropTarget';

describe('forgiving drop geometry', () => {
  const box = { left: 200, top: 200, width: 60, height: 60 },
    size = { width: 56, height: 60 };
  it('accepts near misses and the visible edge of a dragged item', () => {
    expect(
      hitScore({ x: 305, y: 230 }, { x: 305, y: 230 }, box, size, false, false),
    ).not.toBeNull();
    expect(
      hitScore({ x: 330, y: 230 }, { x: 285, y: 230 }, box, size, false, false),
    ).not.toBeNull();
  });
  it('retains a target across a small pointer wobble', () => {
    const p = { x: 340, y: 230 };
    expect(hitScore(p, p, box, size, false, false)).toBeNull();
    expect(hitScore(p, p, box, size, true, false)).not.toBeNull();
  });
  it('has larger tolerance for fingers but does not capture distant objects', () => {
    const p = { x: 340, y: 230 };
    expect(hitScore(p, p, box, size, false, true)).not.toBeNull();
    expect(hitScore({ x: 700, y: 230 }, { x: 700, y: 230 }, box, size, true, true)).toBeNull();
  });
});
