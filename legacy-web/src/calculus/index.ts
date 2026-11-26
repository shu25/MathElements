import {
  add,
  constant,
  derivative,
  div,
  fn,
  integral,
  mul,
  num,
  pow,
  root,
  sub,
  variable,
  type Expression,
} from '../ast/types';
import { simplify } from '../algebra/simplify';
import { isIncomplete } from '../ast/parts';

export function dependsOn(n: Expression, v: string): boolean {
  switch (n.kind) {
    case 'variable':
      return n.name === v;
    case 'add':
      return n.terms.some((t) => dependsOn(t, v));
    case 'multiply':
      return n.factors.some((t) => dependsOn(t, v));
    case 'subtract':
    case 'equation':
      return dependsOn(n.left, v) || dependsOn(n.right, v);
    case 'divide':
      return dependsOn(n.numerator, v) || dependsOn(n.denominator, v);
    case 'power':
      return dependsOn(n.base, v) || dependsOn(n.exponent, v);
    case 'function':
    case 'root':
      return n.argument !== null && dependsOn(n.argument, v);
    case 'derivative':
    case 'integral':
      return n.expression !== null && dependsOn(n.expression, v);
    default:
      return false;
  }
}
export function differentiate(n: Expression, v = 'x'): Expression {
  if (isIncomplete(n)) return derivative(n, v);
  const d = (a: Expression) => differentiate(a, v);
  if (!dependsOn(n, v)) return num(0);
  let result: Expression;
  switch (n.kind) {
    case 'variable':
      return num(n.name === v ? 1 : 0);
    case 'add':
      result = add(...n.terms.map(d));
      break;
    case 'subtract':
      result = sub(d(n.left), d(n.right));
      break;
    case 'multiply':
      result = add(
        ...n.factors.map((_, i) => mul(...n.factors.map((f, j) => (i === j ? d(f) : f)))),
      );
      break;
    case 'divide':
      result = div(
        sub(mul(d(n.numerator), n.denominator), mul(n.numerator, d(n.denominator))),
        pow(n.denominator, num(2)),
      );
      break;
    case 'power':
      if (!dependsOn(n.exponent, v))
        result = mul(n.exponent, pow(n.base, simplify(sub(n.exponent, num(1)))), d(n.base));
      else if (n.base.kind === 'constant' && n.base.name === 'e') result = mul(n, d(n.exponent));
      else return derivative(n, v);
      break;
    case 'root':
      result = n.argument ? div(d(n.argument), mul(num(2), root(n.argument))) : derivative(n, v);
      break;
    case 'function': {
      const a = n.argument;
      if (!a) return derivative(n, v);
      const outer = {
        sin: fn('cos', a),
        cos: mul(num(-1), fn('sin', a)),
        tan: div(num(1), pow(fn('cos', a), num(2))),
        ln: div(num(1), a),
        log: div(num(1), mul(a, fn('ln', num(10)))),
        exp: fn('exp', a),
      }[n.name];
      result = mul(outer, d(a));
      break;
    }
    default:
      return derivative(n, v);
  }
  return simplify(result);
}

function primitive(n: Expression, v: string): Expression | null {
  const x = variable(v);
  if (!dependsOn(n, v)) return mul(n, x);
  if (n.kind === 'variable' && n.name === v) return div(pow(x, num(2)), num(2));
  if (
    n.kind === 'power' &&
    n.base.kind === 'variable' &&
    n.base.name === v &&
    n.exponent.kind === 'number'
  ) {
    const p = n.exponent.value;
    // ln|x| is deliberately left formal until absolute-value nodes are supported.
    return p === -1 ? null : div(pow(x, num(p + 1)), num(p + 1));
  }
  if (
    n.kind === 'power' &&
    n.base.kind === 'constant' &&
    n.base.name === 'e' &&
    n.exponent.kind === 'variable' &&
    n.exponent.name === v
  )
    return n;
  if (n.kind === 'multiply') {
    const dependent = n.factors.filter((f) => dependsOn(f, v));
    const constants = n.factors.filter((f) => !dependsOn(f, v));
    if (dependent.length === 1) {
      const p = primitive(dependent[0], v);
      if (!p) return null;
      // Keep coefficients above the fraction, allowing 2x -> x².
      return p.kind === 'divide'
        ? div(mul(...constants, p.numerator), p.denominator)
        : mul(...constants, p);
    }
  }
  if (n.kind === 'divide' && !dependsOn(n.denominator, v)) {
    const p = primitive(n.numerator, v);
    return p ? div(p, n.denominator) : null;
  }
  if (n.kind === 'add') {
    const parts = n.terms.map((t) => primitive(t, v));
    return parts.every((p) => p !== null) ? add(...parts) : null;
  }
  if (n.kind === 'subtract') {
    const a = primitive(n.left, v),
      b = primitive(n.right, v);
    return a && b ? sub(a, b) : null;
  }
  if (n.kind === 'function' && n.argument?.kind === 'variable' && n.argument.name === v) {
    if (n.name === 'cos') return fn('sin', x);
    if (n.name === 'sin') return mul(num(-1), fn('cos', x));
    if (n.name === 'exp') return n;
  }
  return null;
}
export function integrate(n: Expression, v = 'x'): Expression {
  if (isIncomplete(n)) return integral(n, v);
  const p = primitive(simplify(n), v);
  return p ? add(simplify(p), constant('C')) : integral(n, v);
}
