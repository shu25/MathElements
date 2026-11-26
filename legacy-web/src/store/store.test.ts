import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { add, derivative, div, num, op, pow, variable } from '../ast/types';
import { useGameStore } from './useGameStore';
import { defaults, parseSaved, isScene } from './persistence';
import { emptyScene } from './types';
import { challenges } from '../challenges';

beforeEach(() => {
  vi.useFakeTimers();
  useGameStore.setState({
    mode: 'sandbox',
    domain: 'math',
    scene: emptyScene(),
    sandboxes: { math: emptyScene(), physics: emptyScene() },
    past: [],
    future: [],
    transitions: {},
    selected: null,
    tutorialComplete: false,
    tutorialStep: 0,
    progress: [],
    activeChallenge: 1,
    challengeComplete: false,
    settings: { muted: true, trails: true },
  });
});
afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
});
describe('workspace history and persistence', () => {
  it('undoes and redoes a complete reaction as one transaction', () => {
    const s = useGameStore.getState();
    s.addObject(num(2), 250, 200);
    s.addObject(num(3), 500, 200);
    const [a, b] = useGameStore.getState().scene.objects;
    expect(s.react(a.id, b.node, b.id)).toBe(true);
    expect(useGameStore.getState().scene.objects).toHaveLength(1);
    s.undo();
    expect(useGameStore.getState().scene.objects).toHaveLength(2);
    vi.runAllTimers();
    expect(useGameStore.getState().scene.objects).toHaveLength(2);
    s.redo();
    expect(useGameStore.getState().scene.objects[0].node).toEqual(num(6));
  });
  it('preserves the workspace after an invalid division', () => {
    const s = useGameStore.getState();
    s.addObject(op('divide', num(6)), 200, 200);
    s.addObject(num(0), 400, 200);
    const before = useGameStore.getState().scene,
      [a, b] = before.objects;
    expect(s.react(a.id, b.node, b.id)).toBe(false);
    expect(useGameStore.getState().scene).toEqual(before);
  });
  it('cancels obsolete transformation timers when undoing', () => {
    const s = useGameStore.getState();
    s.addObject(pow(variable(), num(2)), 300, 200);
    const id = useGameStore.getState().scene.objects[0].id;
    s.react(id, derivative());
    expect(Object.keys(useGameStore.getState().transitions)).toHaveLength(1);
    s.undo();
    vi.runAllTimers();
    expect(useGameStore.getState().scene.objects[0].node).toEqual(pow(variable(), num(2)));
    expect(useGameStore.getState().transitions).toEqual({});
  });
  it('restores clear and deletion through undo', () => {
    const s = useGameStore.getState();
    s.addObject(num(7), 300, 200);
    s.clear();
    expect(useGameStore.getState().scene.objects).toHaveLength(0);
    s.undo();
    expect(useGameStore.getState().scene.objects).toHaveLength(1);
  });
  it('keeps math and physics sandboxes independent from challenges', () => {
    const s = useGameStore.getState();
    s.addObject(num(7), 300, 200);
    s.setDomain('physics');
    expect(useGameStore.getState().scene.objects).toHaveLength(0);
    s.setDomain('math');
    expect(useGameStore.getState().scene.objects[0].node).toEqual(num(7));
    s.startChallenge(2);
    s.setMode('sandbox');
    expect(useGameStore.getState().scene.objects[0].node).toEqual(num(7));
  });
  it('does not overlap newly placed scalar objects', () => {
    const s = useGameStore.getState();
    s.addObject(num(2), 300, 200);
    s.addObject(num(3), 300, 200);
    const [a, b] = useGameStore.getState().scene.objects;
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(55);
  });
  it('finishes the tutorial through actual addition', () => {
    const s = useGameStore.getState();
    s.addObject(num(2), 300, 200);
    const id = useGameStore.getState().scene.objects[0].id;
    s.react(id, op('add'));
    s.react(id, num(3));
    expect(useGameStore.getState().tutorialComplete).toBe(true);
  });
  it('recovers from corrupted or malicious local storage', () => {
    expect(parseSaved('{not-json')).toEqual(defaults());
    expect(
      parseSaved(
        JSON.stringify({
          version: 1,
          sandboxes: {
            math: {
              objects: [{ id: 'x', node: { kind: 'number', value: 'NaN' }, x: 1, y: 1 }],
              grid: null,
            },
          },
          progress: [1, 1, -1, 11, '3'],
        }),
      ).progress,
    ).toEqual([1]);
    expect(
      isScene({
        grid: null,
        objects: [
          { id: 'a', x: 1, y: 1, node: num(2) },
          { id: 'a', x: 2, y: 2, node: num(3) },
        ],
      }),
    ).toBe(false);
  });
  it('round-trips valid AST workspaces', () => {
    const saved = defaults();
    saved.sandboxes.math.objects.push({
      id: 'a',
      x: 100,
      y: 100,
      node: add(div(num(1), num(2)), variable()),
    });
    expect(parseSaved(JSON.stringify(saved))).toEqual(saved);
  });
});
describe('challenge semantics', () => {
  it('provides ten challenges', () => expect(challenges).toHaveLength(10));
  it('checks nodes rather than displayed strings', () => {
    const objects = [{ id: 'a', x: 0, y: 0, node: num(5) }];
    expect(challenges[1].test(objects)).toBe(true);
    expect(challenges[1].test([{ ...objects[0], node: add(num(2), num(3)) }])).toBe(false);
    expect(challenges[0].test([{ ...objects[0], node: add(num(1), num(1)) }])).toBe(true);
  });
});
