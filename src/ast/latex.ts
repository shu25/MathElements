import type { Expression, BinaryOperator } from './types';

export const operatorLatex: Record<BinaryOperator, string> = {
  add: '+',
  subtract: '-',
  multiply: '\\times',
  divide: '\\div',
  power: '\\wedge',
  equal: '=',
};
const bracket = (n: Expression): string =>
  ['add', 'subtract', 'equation'].includes(n.kind) || (n.kind === 'number' && n.value < 0)
    ? `\\left(${toLatex(n)}\\right)`
    : toLatex(n);
export function toLatex(n: Expression): string {
  switch (n.kind) {
    case 'hole':
      return '\\square';
    case 'number':
      return String(n.value).replace(/e([+-]?\d+)$/, '\\times 10^{$1}');
    case 'variable':
      return n.name.length === 1 ? n.name : `\\mathit{${n.name}}`;
    case 'constant':
      return n.name === 'pi' ? '\\pi' : n.name;
    case 'operator':
      return n.left
        ? `${bracket(n.left)}\, ${operatorLatex[n.operator]}\, \\square`
        : operatorLatex[n.operator];
    case 'add':
      return n.terms
        .map(
          (t, i) =>
            `${i && !(t.kind === 'number' && t.value < 0) && !(t.kind === 'multiply' && t.factors[0]?.kind === 'number' && t.factors[0].value < 0) ? '+' : ''}${toLatex(t)}`,
        )
        .join(' ');
    case 'subtract':
      return `${toLatex(n.left)} - ${bracket(n.right)}`;
    case 'multiply':
      return n.factors
        .map((f, i) => {
          const prev = n.factors[i - 1];
          const sep =
            i && (f.kind === 'number' || f.kind === 'divide' || prev?.kind === 'divide')
              ? '\\cdot '
              : '';
          if (i === 0 && f.kind === 'number' && f.value === -1 && n.factors.length > 1) return '-';
          return `${sep}${bracket(f)}`;
        })
        .join(' ');
    case 'divide':
      return `\\frac{${toLatex(n.numerator)}}{${toLatex(n.denominator)}}`;
    case 'power':
      return `{${['number', 'variable', 'constant', 'function'].includes(n.base.kind) && !(n.base.kind === 'number' && n.base.value < 0) ? toLatex(n.base) : `\\left(${toLatex(n.base)}\\right)`}}^{${toLatex(n.exponent)}}`;
    case 'root':
      return `\\sqrt{${n.argument ? toLatex(n.argument) : '\\square'}}`;
    case 'equation':
      return `${toLatex(n.left)} = ${toLatex(n.right)}`;
    case 'function':
      return `\\${n.name}\\left(${n.argument ? toLatex(n.argument) : '\\square'}\\right)`;
    case 'derivative':
      return `\\frac{d}{d${n.variable}}${n.expression ? `\\left(${toLatex(n.expression)}\\right)` : ''}`;
    case 'integral':
      return `\\int ${n.expression ? toLatex(n.expression) : ''}\\, d${n.variable}`;
    case 'vector':
      return `\\begin{pmatrix}${n.x}\\\\${n.y}\\end{pmatrix}`;
    case 'matrix':
      return `\\begin{bmatrix}${n.values[0].join('&')}\\\\${n.values[1].join('&')}\\end{bmatrix}`;
    case 'quantity':
      return {
        mass: 'm',
        force: '\\vec{F}',
        velocity: '\\vec{v}',
        acceleration: '\\vec{a}',
        gravity: 'g',
        time: 't',
        distance: 's',
      }[n.quantity];
  }
}
