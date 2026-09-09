import { div, num, type Expression } from '../ast/types';
export interface Rational {
  n: bigint;
  d: bigint;
}
export function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}
export const lcm = (a: bigint, b: bigint) => (a / gcd(a, b)) * b;
export function rational(n: bigint, d = 1n): Rational {
  if (d === 0n) throw new Error('0で割ることはできません');
  const g = gcd(n, d) * (d < 0n ? -1n : 1n);
  return { n: n / g, d: d / g };
}
export const rAdd = (a: Rational, b: Rational) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
export const rMul = (a: Rational, b: Rational) => rational(a.n * b.n, a.d * b.d);
export const rDiv = (a: Rational, b: Rational) => rational(a.n * b.d, a.d * b.n);
export function fromNumber(value: number): Rational {
  const [mantissa, exponent = '0'] = value.toString().toLowerCase().split('e');
  const places = (mantissa.split('.')[1]?.length ?? 0) - Number(exponent);
  const digits = BigInt(mantissa.replace('.', ''));
  return places >= 0
    ? rational(digits, 10n ** BigInt(places))
    : rational(digits * 10n ** BigInt(-places));
}
export function asRational(n: Expression): Rational | null {
  if (n.kind === 'number') return fromNumber(n.value);
  if (n.kind === 'divide') {
    const a = asRational(n.numerator),
      b = asRational(n.denominator);
    if (a && b && b.n !== 0n) return rDiv(a, b);
  }
  return null;
}
export function fromRational(r: Rational): Expression | null {
  const limit = BigInt(Number.MAX_SAFE_INTEGER);
  if (r.n > limit || r.n < -limit || r.d > limit) return null;
  return r.d === 1n ? num(Number(r.n)) : div(num(Number(r.n)), num(Number(r.d)));
}
