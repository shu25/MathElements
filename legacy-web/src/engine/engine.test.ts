import { describe, expect, it } from 'vitest';
import {
  add,
  constant,
  derivative,
  div,
  equation,
  fn,
  integral,
  isExpression,
  matrix,
  mul,
  num,
  op,
  pow,
  quantity,
  root,
  same,
  sub,
  variable,
  vector,
} from '../ast/types';
import { toLatex } from '../ast/latex';
import { simplify, expand } from '../algebra/simplify';
import { evaluate } from '../algebra/evaluate';
import { differentiate, integrate } from '../calculus';
import {
  engine,
  nextEquationStep,
  operateEquation,
  ReactionEngine,
  simplifySteps,
} from './ReactionEngine';

const x = variable(),
  pi = constant('pi');
describe('AST and notation', () => {
  it('keeps mathematical structure independent of position and presentation', () => {
    const expression = add(mul(num(2), x), num(3));
    expect(expression).toEqual({
      kind: 'add',
      terms: [
        {
          kind: 'multiply',
          factors: [
            { kind: 'number', value: 2 },
            { kind: 'variable', name: 'x' },
          ],
        },
        { kind: 'number', value: 3 },
      ],
    });
    expect(isExpression(expression)).toBe(true);
  });
  it('stores both equation sides separately', () => {
    expect(equation(x, num(2)).right).toEqual(num(2));
  });
  it('renders fractions vertically and powers as superscripts', () => {
    expect(toLatex(div(num(1), num(2)))).toBe('\\frac{1}{2}');
    expect(toLatex(pow(x, num(2)))).toBe('{x}^{2}');
    expect(toLatex(pow(num(-2), num(2)))).toContain('\\left(-2\\right)');
  });
  it.each([NaN, Infinity, -Infinity])('refuses nonfinite numbers: %s', (value) =>
    expect(() => num(value)).toThrow(),
  );
  it.each([
    null,
    { kind: 'number', value: NaN },
    { kind: 'add', terms: [] },
    { kind: 'variable', name: '\\html{bad}' },
    { kind: 'matrix', values: [[1, 2]] },
    { kind: 'power', base: num(2) },
  ])('validates untrusted trees', (node) => expect(isExpression(node)).toBe(false));
});

describe('exact arithmetic and algebra', () => {
  it.each([
    [add(num(2), num(3)), num(5)],
    [mul(num(2), num(3)), num(6)],
    [div(num(6), num(2)), num(3)],
    [sub(num(3), num(5)), num(-2)],
    [add(num(0.1), num(0.2)), div(num(3), num(10))],
    [add(x, x), mul(num(2), x)],
    [add(mul(num(2), x), mul(num(3), x)), mul(num(5), x)],
    [mul(x, x), pow(x, num(2))],
    [mul(pow(x, num(2)), x), pow(x, num(3))],
    [mul(num(2), x), mul(num(2), x)],
    [div(num(2), num(4)), div(num(1), num(2))],
    [div(num(1), num(-2)), div(num(-1), num(2))],
    [pow(num(2), num(-3)), div(num(1), num(8))],
    [add(div(num(1), num(2)), div(num(1), num(3))), div(num(5), num(6))],
    [div(mul(num(2), x), num(2)), x],
    [sub(add(mul(num(2), x), num(3)), num(3)), mul(num(2), x)],
  ])('simplifies %j', (input, expected) => expect(simplify(input)).toEqual(expected));
  it('shows the least common denominator before adding fractions', () => {
    const result = simplifySteps(add(div(num(1), num(2)), div(num(1), num(3))));
    expect(result.intermediate).toEqual(add(div(num(3), num(6)), div(num(2), num(6))));
    expect(result.result).toEqual(div(num(5), num(6)));
  });
  it('keeps pi/2 symbolic and exposes numeric approximation separately', () => {
    const expression = div(pi, num(2));
    expect(simplify(expression)).toEqual(expression);
    expect(evaluate(expression)).toBeCloseTo(Math.PI / 2, 12);
  });
  it('does not cancel a symbolic denominator with unknown domain', () =>
    expect(simplify(div(x, x))).toEqual(div(x, x)));
  it('preserves expressions beyond safe integer arithmetic', () => {
    const expression = mul(num(Number.MAX_SAFE_INTEGER), num(3));
    expect(simplify(expression)).toEqual(expression);
  });
  it.each([
    div(num(1), num(0)),
    root(num(-1)),
    fn('ln', num(0)),
    fn('tan', div(pi, num(2))),
    pow(num(0), num(0)),
    pow(num(0), num(-1)),
  ])('rejects undefined real operations without nonfinite results', (expression) =>
    expect(() => simplify(expression)).toThrow(),
  );
});

describe('functions', () => {
  it.each([
    [fn('sin', num(0)), num(0)],
    [fn('sin', pi), num(0)],
    [fn('cos', num(0)), num(1)],
    [fn('cos', pi), num(-1)],
    [root(num(4)), num(2)],
    [root(num(9)), num(3)],
    [root(div(num(1), num(4))), div(num(1), num(2))],
    [fn('ln', constant('e')), num(1)],
    [fn('log', num(100)), num(2)],
    [fn('exp', num(0)), num(1)],
  ])('recognizes exact values', (input, expected) => expect(simplify(input)).toEqual(expected));
  it('keeps sin(1) symbolic', () => expect(simplify(fn('sin', num(1)))).toEqual(fn('sin', num(1))));
  it('collects multivariable like terms regardless of factor order', () => {
    const y = variable('y');
    expect(simplify(add(mul(x, y), mul(y, x)))).toEqual(mul(num(2), x, y));
  });
});

describe('equation operations', () => {
  const first = equation(add(mul(num(2), x), num(3)), num(7));
  it('subtracts the same quantity from both sides with a teaching step', () => {
    const result = operateEquation(first, 'subtract', num(3));
    expect(result?.intermediate).toEqual(
      equation(sub(first.left, num(3)), sub(first.right, num(3))),
    );
    expect(result?.result).toEqual(equation(mul(num(2), x), num(4)));
  });
  it('divides both sides to isolate the variable', () => {
    const result = operateEquation(equation(mul(num(2), x), num(4)), 'divide', num(2));
    expect(result?.intermediate).toEqual(
      equation(div(mul(num(2), x), num(2)), div(num(4), num(2))),
    );
    expect(result?.result).toEqual(equation(x, num(2)));
  });
  it('suggests valid consecutive operations', () => {
    expect(nextEquationStep(first)).toMatchObject({ operation: 'subtract', operand: num(3) });
    expect(nextEquationStep(equation(mul(num(2), x), num(4)))).toMatchObject({
      operation: 'divide',
      operand: num(2),
    });
    expect(nextEquationStep(equation(x, num(2)))).toBeNull();
  });
  it('refuses non-reversible multiplication and division', () => {
    expect(operateEquation(first, 'divide', num(0))).toBeNull();
    expect(operateEquation(first, 'multiply', num(0))).toBeNull();
    expect(operateEquation(first, 'divide', x)).toBeNull();
  });
});

describe('calculus', () => {
  it.each([
    [x, num(1)],
    [pow(x, num(2)), mul(num(2), x)],
    [pow(x, num(3)), mul(num(3), pow(x, num(2)))],
    [pow(x, num(8)), mul(num(8), pow(x, num(7)))],
    [fn('sin', x), fn('cos', x)],
    [fn('cos', x), mul(num(-1), fn('sin', x))],
    [pow(constant('e'), x), pow(constant('e'), x)],
    [fn('ln', x), div(num(1), x)],
    [num(5), num(0)],
    [variable('y'), num(0)],
  ])('differentiates supported expressions', (input, expected) =>
    expect(differentiate(input)).toEqual(expected),
  );
  it('applies the chain rule', () => {
    const d = differentiate(fn('sin', pow(x, num(2))));
    expect(evaluate(d, { x: 1 })).toBeCloseTo(2 * Math.cos(1), 12);
  });
  it.each([
    [x, add(div(pow(x, num(2)), num(2)), constant('C'))],
    [mul(num(2), x), add(pow(x, num(2)), constant('C'))],
    [fn('cos', x), add(fn('sin', x), constant('C'))],
    [pow(constant('e'), x), add(pow(constant('e'), x), constant('C'))],
    [num(0), add(num(0), constant('C'))],
  ])('integrates and always includes C', (input, expected) =>
    expect(integrate(input)).toEqual(expected),
  );
  it('keeps unsupported integrals formal instead of inventing an answer', () => {
    const input = fn('sin', pow(x, num(2)));
    expect(integrate(input)).toEqual(integral(input));
  });
});

describe('reaction rules and decomposition', () => {
  it('builds a three-element addition and evaluates only when requested', () => {
    const pending = engine.combine(num(2), op('add'))?.result;
    expect(pending).toEqual(op('add', num(2)));
    const expression = engine.combine(pending!, num(3))?.result;
    expect(expression).toEqual(add(num(2), num(3)));
    expect(engine.simplify(expression!)).toEqual(num(5));
  });
  it('works with reversed tool direction', () =>
    expect(engine.combine(op('divide', num(6)), num(2))?.result).toEqual(div(num(6), num(2))));
  it('implicitly multiplies scalar objects', () =>
    expect(engine.combine(x, x)?.result).toEqual(pow(x, num(2))));
  it('shows a derivative before its result', () => {
    expect(engine.combine(pow(x, num(2)), derivative())).toMatchObject({
      intermediate: derivative(pow(x, num(2))),
      result: mul(num(2), x),
    });
  });
  it('preserves inputs on incompatible operations', () => {
    const a = op('divide', num(6)),
      b = num(0),
      before = structuredClone([a, b]);
    expect(engine.canCombine(a, b)).toBe(false);
    expect(engine.combine(a, b)).toBeNull();
    expect([a, b]).toEqual(before);
    expect(engine.canCombine(matrix(), fn('sin'))).toBe(false);
    expect(engine.canCombine(op('add'), op('add'))).toBe(false);
  });
  it('expands a coefficient, powers and a sum without discarding AST children', () => {
    expect(expand(mul(num(3), x))).toEqual([num(3), op('multiply'), x]);
    expect(expand(pow(x, num(3)))).toEqual([x, op('multiply'), x, op('multiply'), x]);
    expect(expand(add(mul(num(2), x), num(3)))).toEqual([mul(num(2), x), op('add'), num(3)]);
  });
  it('adds vectors and multiplies a matrix by a vector', () => {
    expect(engine.combine(vector(3, 1), vector(1, 2))?.result).toEqual(vector(4, 3));
    expect(
      engine.combine(
        matrix([
          [2, 0],
          [0, 1],
        ]),
        vector(3, 2),
      )?.result,
    ).toEqual(vector(6, 2));
    expect(
      engine.combine(
        matrix([
          [0, -1],
          [1, 0],
        ]),
        vector(1, 0),
      )?.result,
    ).toEqual(vector(0, 1));
  });
  it('attaches quantities only to physical bodies', () => {
    expect(engine.canCombine(quantity('mass'), quantity('force'))).toBe(false);
    expect(
      engine.combine(quantity('mass'), quantity('force'), { targetIsBody: true })?.quantity,
    ).toEqual(quantity('force'));
  });
  it('supports independent rule registration', () => {
    const extended = new ReactionEngine();
    extended.register({
      id: 'custom',
      matches: (a, b) => same(a, variable('a')) && same(b, variable('b')),
      react: () => ({ result: variable('z') }),
    });
    expect(extended.combine(variable('a'), variable('b'))?.result).toEqual(variable('z'));
  });
});
