import { describe, expect, it, beforeEach } from 'vitest';
import { add, div, fn, isExpression, isScalar, num, variable } from './types';
import { children, decodePath, getPart, hasHole, replacePart } from './parts';
import { combinePart, engine } from '../engine/ReactionEngine';
import { useGameStore } from '../store/useGameStore';
import { emptyScene } from '../store/types';
import { parseSaved, defaults } from '../store/persistence';
import { interactiveLatex } from './interactiveLatex';
import katex from 'katex';

const expression = fn('sin', add(num(2), num(3)));
const path = ['argument', 'terms:0'];
describe('nested expression editing', () => {
  it('addresses inner terms structurally without parsing rendered text', () => {
    expect(getPart(expression, path)).toEqual(num(2));
    expect(getPart(expression, ['argument', 'terms:99'])).toBeNull();
    expect(children(expression)[0].label).toBe('中身');
  });
  it('replaces a child without mutating its siblings or source AST', () => {
    expect(replacePart(expression, path, num(7))).toEqual(fn('sin', add(num(7), num(3))));
    expect(getPart(expression, path)).toEqual(num(2));
    expect(() => replacePart(expression, ['__proto__'], num(7))).toThrow();
    expect(decodePath('argument.terms:0')).toEqual(path);
    expect(decodePath('argument.__proto__')).toEqual([]);
  });
  it('preserves an unfilled slot instead of treating it as zero', () => {
    const incomplete = replacePart(expression, path, { kind: 'hole' });
    expect(hasHole(incomplete)).toBe(true);
    expect(isExpression(incomplete)).toBe(true);
    expect(isScalar(incomplete)).toBe(false);
    expect(engine.simplify(incomplete)).toEqual(incomplete);
    expect(engine.evaluate(incomplete)).toBeNull();
    expect(engine.differentiate(incomplete).kind).toBe('derivative');
    expect(engine.integrate(incomplete).kind).toBe('integral');
  });
  it('fills a hole and rejects parent domain violations', () => {
    const incomplete = replacePart(expression, path, { kind: 'hole' });
    expect(combinePart(incomplete, path, num(2))?.result).toEqual(expression);
    expect(combinePart(div(num(1), { kind: 'hole' }), ['denominator'], num(0))).toBeNull();
    expect(
      combinePart({ kind: 'root', argument: { kind: 'hole' } }, ['argument'], num(-1)),
    ).toBeNull();
  });
  it('renders addressable nested spans with the same mathematical notation', () => {
    const html = katex.renderToString(interactiveLatex(expression), {
      strict: false,
      trust: (c) => c.command === '\\htmlData',
    });
    expect(html).toContain('data-node-path="argument.terms:0"');
    expect(html).not.toContain('katex-error');
  });
});
describe('nested editing transactions', () => {
  beforeEach(() =>
    useGameStore.setState({
      mode: 'sandbox',
      domain: 'math',
      scene: emptyScene(),
      sandboxes: { math: emptyScene(), physics: emptyScene() },
      past: [],
      future: [],
      selected: null,
      selectedPart: null,
      transitions: {},
      settings: { muted: true, trails: true },
    }),
  );
  it('extracts and re-inserts a child with undo/redo and no lost data', () => {
    const s = useGameStore.getState();
    s.addObject(expression, 300, 250);
    const id = useGameStore.getState().scene.objects[0].id;
    s.extractPart(id, path);
    let objects = useGameStore.getState().scene.objects;
    expect(objects).toHaveLength(2);
    expect(getPart(objects[0].node, path)).toEqual({ kind: 'hole' });
    expect(objects[1].node).toEqual(num(2));
    s.undo();
    expect(useGameStore.getState().scene.objects[0].node).toEqual(expression);
    s.redo();
    objects = useGameStore.getState().scene.objects;
    expect(s.react(id, objects[1].node, objects[1].id, undefined, path)).toBe(true);
    expect(useGameStore.getState().scene.objects).toHaveLength(1);
    expect(useGameStore.getState().scene.objects[0].node).toEqual(expression);
  });
  it('breaks the whole parenthesized argument into its pieces', () => {
    const s = useGameStore.getState();
    s.addObject(expression, 300, 250);
    s.extractPart(
      useGameStore.getState().scene.objects[0].id,
      ['argument'],
      undefined,
      undefined,
      true,
    );
    expect(useGameStore.getState().scene.objects.map((o) => o.node.kind)).toEqual([
      'function',
      'number',
      'operator',
      'number',
    ]);
    expect(useGameStore.getState().scene.objects[0].node).toEqual(fn('sin', { kind: 'hole' }));
  });
  it('moves a child directly to another object in one undo step', () => {
    const s = useGameStore.getState();
    s.addObject(expression, 300, 250);
    s.addObject(variable(), 600, 250);
    const [source, target] = useGameStore.getState().scene.objects;
    expect(s.react(target.id, num(2), source.id, undefined, [], path)).toBe(true);
    expect(useGameStore.getState().scene.objects).toHaveLength(2);
    expect(getPart(useGameStore.getState().scene.objects[0].node, path)?.kind).toBe('hole');
    s.undo();
    expect(useGameStore.getState().scene.objects[0].node).toEqual(expression);
  });
  it('persists unfinished expressions', () => {
    const saved = defaults();
    saved.sandboxes.math.objects.push({
      id: 'nested',
      x: 100,
      y: 100,
      node: replacePart(expression, path, { kind: 'hole' }),
    });
    expect(parseSaved(JSON.stringify(saved))).toEqual(saved);
  });
});
