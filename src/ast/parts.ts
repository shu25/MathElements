import type { Expression } from './types';

export type ExpressionPath = string[];
export interface ExpressionChild {
  key: string;
  node: Expression;
  label: string;
}
export function children(n: Expression): ExpressionChild[] {
  switch (n.kind) {
    case 'add':
      return n.terms.map((node, i) => ({ key: `terms:${i}`, node, label: `項 ${i + 1}` }));
    case 'multiply':
      return n.factors.map((node, i) => ({ key: `factors:${i}`, node, label: `因子 ${i + 1}` }));
    case 'equation':
    case 'subtract':
      return [
        { key: 'left', node: n.left, label: '左側' },
        { key: 'right', node: n.right, label: '右側' },
      ];
    case 'divide':
      return [
        { key: 'numerator', node: n.numerator, label: '分子' },
        { key: 'denominator', node: n.denominator, label: '分母' },
      ];
    case 'power':
      return [
        { key: 'base', node: n.base, label: '底' },
        { key: 'exponent', node: n.exponent, label: '指数' },
      ];
    case 'function':
    case 'root':
      return n.argument ? [{ key: 'argument', node: n.argument, label: '中身' }] : [];
    case 'integral':
    case 'derivative':
      return n.expression ? [{ key: 'expression', node: n.expression, label: '中身' }] : [];
    case 'operator':
      return n.left ? [{ key: 'left', node: n.left, label: '左側' }] : [];
    default:
      return [];
  }
}
export function getPart(n: Expression, path: ExpressionPath): Expression | null {
  let current = n;
  for (const key of path) {
    const child = children(current).find((c) => c.key === key);
    if (!child) return null;
    current = child.node;
  }
  return current;
}
export function replacePart(
  n: Expression,
  path: ExpressionPath,
  replacement: Expression,
): Expression {
  if (!path.length) return replacement;
  const [key, ...rest] = path;
  const child = children(n).find((c) => c.key === key);
  if (!child) throw new Error('選択した部分が見つかりません');
  const updated = replacePart(child.node, rest, replacement);
  if (n.kind === 'add')
    return { ...n, terms: n.terms.map((v, i) => (key === `terms:${i}` ? updated : v)) };
  if (n.kind === 'multiply')
    return { ...n, factors: n.factors.map((v, i) => (key === `factors:${i}` ? updated : v)) };
  return { ...n, [key]: updated } as Expression;
}
export function hasHole(n: Expression): boolean {
  return n.kind === 'hole' || children(n).some((c) => hasHole(c.node));
}
export function isIncomplete(n: Expression): boolean {
  return (
    n.kind === 'hole' ||
    n.kind === 'operator' ||
    ((n.kind === 'root' || n.kind === 'function') && n.argument === null) ||
    ((n.kind === 'derivative' || n.kind === 'integral') && n.expression === null) ||
    children(n).some((c) => isIncomplete(c.node))
  );
}
export function encodePath(path: ExpressionPath): string {
  return path.join('.');
}
export function decodePath(value: string | null): ExpressionPath {
  return value &&
    /^(?:argument|expression|left|right|base|exponent|numerator|denominator|terms:\d+|factors:\d+)(?:\.(?:argument|expression|left|right|base|exponent|numerator|denominator|terms:\d+|factors:\d+))*$/.test(
      value,
    )
    ? value.split('.')
    : [];
}
