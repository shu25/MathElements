import type { Expression } from '../ast/types';

export class MathDomainError extends Error {}
export function evaluate(n: Expression, variables: Record<string, number> = {}): number | null {
  const ev = (x: Expression) => evaluate(x, variables);
  let result: number | null;
  switch (n.kind) {
    case 'number':
      return n.value;
    case 'constant':
      return n.name === 'pi' ? Math.PI : n.name === 'e' ? Math.E : null;
    case 'variable':
      return Number.isFinite(variables[n.name]) ? variables[n.name] : null;
    case 'add':
    case 'multiply': {
      const values = (n.kind === 'add' ? n.terms : n.factors).map(ev);
      if (values.some((v) => v === null)) return null;
      result = (values as number[]).reduce(
        (a, b) => (n.kind === 'add' ? a + b : a * b),
        n.kind === 'add' ? 0 : 1,
      );
      break;
    }
    case 'subtract': {
      const a = ev(n.left),
        b = ev(n.right);
      result = a === null || b === null ? null : a - b;
      break;
    }
    case 'divide': {
      const a = ev(n.numerator),
        b = ev(n.denominator);
      if (b === 0) throw new MathDomainError('0で割ることはできません');
      result = a === null || b === null ? null : a / b;
      break;
    }
    case 'power': {
      const a = ev(n.base),
        b = ev(n.exponent);
      if (a === 0 && b !== null && b <= 0)
        throw new MathDomainError('0の0乗・負のべき乗は定義されません');
      result = a === null || b === null ? null : a ** b;
      break;
    }
    case 'root': {
      const a = n.argument && ev(n.argument);
      if (a !== null && a < 0) throw new MathDomainError('実数では負の数の平方根を作れません');
      result = a === null ? null : Math.sqrt(a);
      break;
    }
    case 'function': {
      const a = n.argument && ev(n.argument);
      if (a === null) return null;
      if ((n.name === 'log' || n.name === 'ln') && a <= 0)
        throw new MathDomainError('対数の引数は正の実数です');
      if (n.name === 'tan' && Math.abs(Math.cos(a)) < 1e-12)
        throw new MathDomainError('この角度でtanは定義されません');
      const f = {
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        log: Math.log10,
        ln: Math.log,
        exp: Math.exp,
      }[n.name];
      result = f(a);
      break;
    }
    default:
      return null;
  }
  if (result !== null && !Number.isFinite(result))
    throw new MathDomainError('実数の有限範囲で評価できません');
  return result;
}
