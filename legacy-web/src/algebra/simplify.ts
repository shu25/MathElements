import { add, div, mul, num, pow, same, sub, vector, type Expression } from '../ast/types';
import { asRational, fromRational, rational, rAdd, rMul, rDiv, type Rational } from './rational';
import { evaluate } from './evaluate';
import { isIncomplete } from '../ast/parts';

const one = () => rational(1n);
function coefficient(n: Expression): { coefficient: Rational; body: Expression | null } {
  const r = asRational(n);
  if (r) return { coefficient: r, body: null };
  if (n.kind === 'multiply') {
    let c = one();
    const rest: Expression[] = [];
    for (const f of n.factors) {
      const value = asRational(f);
      if (value) c = rMul(c, value);
      else rest.push(f);
    }
    return {
      coefficient: c,
      body: rest.length === 0 ? null : rest.length === 1 ? rest[0] : mul(...rest),
    };
  }
  return { coefficient: one(), body: n };
}
function withCoefficient(c: Rational, body: Expression | null): Expression | null {
  const value = fromRational(c);
  if (!value) return null;
  if (c.n === 0n || body === null) return value;
  return c.n === c.d ? body : mul(value, ...(body.kind === 'multiply' ? body.factors : [body]));
}
function simplifyAdd(terms: Expression[]): Expression {
  const flat = terms.flatMap((t) => (t.kind === 'add' ? t.terms : [t]));
  const groups = new Map<string, { c: Rational; body: Expression | null }>();
  for (const t of flat) {
    const { coefficient: c, body } = coefficient(t);
    const key = body === null ? '_number' : JSON.stringify(body);
    const existing = groups.get(key);
    groups.set(key, { c: existing ? rAdd(existing.c, c) : c, body });
  }
  const output: Expression[] = [];
  for (const { c, body } of groups.values()) {
    if (!c.n) continue;
    const term = withCoefficient(c, body);
    if (!term) return add(...flat);
    output.push(term);
  }
  return output.length === 0 ? num(0) : output.length === 1 ? output[0] : add(...output);
}
function simplifyMultiply(factors: Expression[]): Expression {
  const flat = factors.flatMap((f) => (f.kind === 'multiply' ? f.factors : [f]));
  // Distribute a numeric coefficient so subtracting the same sum cancels term by term.
  const sum = flat.find((f) => f.kind === 'add');
  if (sum?.kind === 'add' && flat.filter((f) => f !== sum).every((f) => asRational(f))) {
    return simplify(add(...sum.terms.map((t) => mul(...flat.map((f) => (f === sum ? t : f))))));
  }
  let c = one();
  const groups = new Map<string, { base: Expression; exponent: number }>();
  for (const f of flat) {
    const r = asRational(f);
    if (r) {
      c = rMul(c, r);
      continue;
    }
    const isPower =
      f.kind === 'power' &&
      f.exponent.kind === 'number' &&
      Number.isInteger(f.exponent.value) &&
      f.exponent.value > 0;
    const base = isPower && f.kind === 'power' ? f.base : f;
    const exponent =
      isPower && f.kind === 'power' && f.exponent.kind === 'number' ? f.exponent.value : 1;
    const key = JSON.stringify(base),
      existing = groups.get(key);
    groups.set(key, { base, exponent: (existing?.exponent ?? 0) + exponent });
  }
  if (!c.n) return num(0);
  const rest = [...groups.values()]
    .sort((a, b) => JSON.stringify(a.base).localeCompare(JSON.stringify(b.base)))
    .map(({ base, exponent }) => (exponent === 1 ? base : pow(base, num(exponent))));
  const body = rest.length === 0 ? null : rest.length === 1 ? rest[0] : mul(...rest);
  return withCoefficient(c, body) ?? mul(...flat);
}

export function simplify(n: Expression): Expression {
  if (isIncomplete(n)) return n;
  switch (n.kind) {
    case 'add': {
      const terms = n.terms.map(simplify);
      if (terms.every((t) => t.kind === 'vector'))
        return vector(
          terms.reduce((s, t) => s + t.x, 0),
          terms.reduce((s, t) => s + t.y, 0),
        );
      return simplifyAdd(terms);
    }
    case 'subtract':
      return simplify(add(n.left, mul(num(-1), n.right)));
    case 'multiply':
      return simplifyMultiply(n.factors.map(simplify));
    case 'divide': {
      const a = simplify(n.numerator),
        b = simplify(n.denominator);
      const node = div(a, b);
      evaluate(node);
      const ra = asRational(a),
        rb = asRational(b);
      if (ra && rb && rb.n) return fromRational(rDiv(ra, rb)) ?? node;
      if (rb?.n === rb?.d && rb) return a;
      if (rb && rb.n !== 0n) {
        const { coefficient: c, body } = coefficient(a);
        // Retain a conventional vertical fraction for x/2.
        const ratio = rDiv(c, rb);
        if (ratio.d === 1n) return withCoefficient(ratio, body) ?? node;
      }
      return node;
    }
    case 'power': {
      const base = simplify(n.base),
        exponent = simplify(n.exponent);
      const node = pow(base, exponent);
      evaluate(node);
      if (exponent.kind === 'number') {
        if (exponent.value === 1) return base;
        if (exponent.value === 0) return num(1);
        const r = asRational(base);
        if (r && Number.isInteger(exponent.value) && Math.abs(exponent.value) <= 64) {
          const p = BigInt(Math.abs(exponent.value));
          const result =
            exponent.value < 0 ? rational(r.d ** p, r.n ** p) : rational(r.n ** p, r.d ** p);
          return fromRational(result) ?? node;
        }
      }
      return node;
    }
    case 'root': {
      if (!n.argument) return n;
      const argument = simplify(n.argument),
        result = { ...n, argument };
      const value = evaluate(result),
        r = asRational(argument);
      if (r && value !== null) {
        const a = Math.sqrt(Number(r.n)),
          b = Math.sqrt(Number(r.d));
        if (Number.isSafeInteger(a) && Number.isSafeInteger(b))
          return fromRational(rational(BigInt(a), BigInt(b))) ?? result;
      }
      return result;
    }
    case 'function': {
      if (!n.argument) return n;
      const argument = simplify(n.argument),
        result = { ...n, argument };
      const value = evaluate(result);
      if (value !== null) {
        const atZero = argument.kind === 'number' && argument.value === 0;
        const isPiMultiple =
          (argument.kind === 'constant' && argument.name === 'pi') ||
          (argument.kind === 'divide' &&
            argument.numerator.kind === 'constant' &&
            argument.numerator.name === 'pi' &&
            argument.denominator.kind === 'number' &&
            [1, 2].includes(Math.abs(argument.denominator.value))) ||
          (argument.kind === 'multiply' &&
            argument.factors.some((f) => f.kind === 'constant' && f.name === 'pi') &&
            argument.factors.every(
              (f) =>
                (f.kind === 'constant' && f.name === 'pi') ||
                (f.kind === 'number' && Number.isInteger(f.value)),
            ));
        if (
          ['sin', 'cos', 'tan'].includes(n.name) &&
          (atZero || isPiMultiple) &&
          Math.abs(value - Math.round(value)) < 1e-12
        )
          return num(Math.round(value));
        if (n.name === 'ln' && argument.kind === 'constant' && argument.name === 'e') return num(1);
        if (
          ['log', 'ln', 'exp'].includes(n.name) &&
          argument.kind === 'number' &&
          Number.isSafeInteger(value)
        )
          return num(value);
      }
      return result;
    }
    case 'equation':
      return { ...n, left: simplify(n.left), right: simplify(n.right) };
    default:
      return n;
  }
}

export function expand(n: Expression): Expression[] {
  const intersperse = (parts: Expression[], operator: 'add' | 'multiply'): Expression[] =>
    parts.flatMap((p, i) => (i ? [{ kind: 'operator', operator } as Expression, p] : [p]));
  switch (n.kind) {
    case 'add':
      return intersperse(n.terms, 'add');
    case 'multiply':
      return intersperse(n.factors, 'multiply');
    case 'subtract':
      return [n.left, { kind: 'operator', operator: 'subtract' }, n.right];
    case 'divide':
      return [n.numerator, { kind: 'operator', operator: 'divide' }, n.denominator];
    case 'equation':
      return [n.left, { kind: 'operator', operator: 'equal' }, n.right];
    case 'power':
      return n.exponent.kind === 'number' &&
        Number.isInteger(n.exponent.value) &&
        n.exponent.value >= 2 &&
        n.exponent.value <= 12
        ? intersperse(
            Array.from({ length: n.exponent.value }, () => structuredClone(n.base)),
            'multiply',
          )
        : [n.base, { kind: 'operator', operator: 'power' }, n.exponent];
    case 'root':
      return n.argument ? [{ ...n, argument: null }, n.argument] : [n];
    case 'function':
      return n.argument ? [{ ...n, argument: null }, n.argument] : [n];
    case 'derivative':
    case 'integral':
      return n.expression ? [{ ...n, expression: null }, n.expression] : [n];
    case 'operator':
      return n.left ? [n.left, { kind: 'operator', operator: n.operator }] : [n];
    default:
      return [n];
  }
}

export function equivalent(a: Expression, b: Expression): boolean {
  try {
    const x = simplify(a),
      y = simplify(b);
    if (same(x, y)) return true;
    if (x.kind === 'add' && y.kind === 'add')
      return (
        x.terms.length === y.terms.length &&
        x.terms.every((t) => y.terms.some((u) => equivalent(t, u)))
      );
    return false;
  } catch {
    return false;
  }
}

export function linearParts(n: Expression, v = 'x'): { a: number; b: number } | null {
  if (n.kind === 'variable') return n.name === v ? { a: 1, b: 0 } : null;
  if (n.kind === 'number') return { a: 0, b: n.value };
  if (n.kind === 'add' || n.kind === 'subtract') {
    const parts = (n.kind === 'add' ? n.terms : [n.left, mul(num(-1), n.right)]).map((t) =>
      linearParts(t, v),
    );
    if (parts.some((p) => p === null)) return null;
    return parts.reduce<{ a: number; b: number }>(
      (s, p) => ({ a: s.a + (p?.a ?? 0), b: s.b + (p?.b ?? 0) }),
      { a: 0, b: 0 },
    );
  }
  if (n.kind === 'multiply') {
    let result = { a: 0, b: 1 };
    for (const f of n.factors) {
      const p = linearParts(f, v);
      if (!p || (result.a !== 0 && p.a !== 0)) return null;
      result = { a: result.a * p.b + p.a * result.b, b: result.b * p.b };
    }
    return result;
  }
  if (n.kind === 'divide') {
    const a = linearParts(n.numerator, v),
      b = linearParts(n.denominator, v);
    if (a && b && b.a === 0 && b.b !== 0) return { a: a.a / b.b, b: a.b / b.b };
  }
  return null;
}

export function subtractBoth(left: Expression, right: Expression, term: Expression): Expression {
  return { kind: 'equation', left: sub(left, term), right: sub(right, term) };
}
