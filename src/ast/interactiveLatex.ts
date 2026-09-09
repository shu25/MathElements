import type { Expression } from './types';
import { toLatex, operatorLatex } from './latex';
import { encodePath, type ExpressionPath } from './parts';

export interface InteractiveOptions {
  parenthesized?: boolean;
  prefix?: ExpressionPath;
  selected?: string;
  target?: string;
}
// Only internal AST paths are emitted as attributes; no user-authored HTML is trusted.
export function interactiveLatex(node: Expression, options: InteractiveOptions = {}): string {
  const render = (n: Expression, path: ExpressionPath): string => {
    const child = (v: Expression, key: string) => render(v, [...path, key]);
    const grouped = (v: Expression, key: string) =>
      ['add', 'subtract', 'equation'].includes(v.kind) || (v.kind === 'number' && v.value < 0)
        ? `\\left(${child(v, key)}\\right)`
        : child(v, key);
    let text: string;
    switch (n.kind) {
      case 'add':
        text = n.terms
          .map(
            (t, i) =>
              `${i && !(t.kind === 'number' && t.value < 0) && !(t.kind === 'multiply' && t.factors[0]?.kind === 'number' && t.factors[0].value < 0) ? '+' : ''}${child(t, `terms:${i}`)}`,
          )
          .join(' ');
        break;
      case 'multiply':
        text = n.factors
          .map(
            (f, i) =>
              `${i && (f.kind === 'number' || f.kind === 'divide' || n.factors[i - 1]?.kind === 'divide') ? '\\cdot ' : ''}${grouped(f, `factors:${i}`)}`,
          )
          .join(' ');
        break;
      case 'subtract':
        text = `${child(n.left, 'left')} - ${grouped(n.right, 'right')}`;
        break;
      case 'equation':
        text = `${child(n.left, 'left')} = ${child(n.right, 'right')}`;
        break;
      case 'divide':
        text = `\\frac{${child(n.numerator, 'numerator')}}{${child(n.denominator, 'denominator')}}`;
        break;
      case 'power':
        text = `{${['number', 'variable', 'constant', 'function', 'hole'].includes(n.base.kind) && !(n.base.kind === 'number' && n.base.value < 0) ? child(n.base, 'base') : `\\left(${child(n.base, 'base')}\\right)`}}^{${child(n.exponent, 'exponent')}}`;
        break;
      case 'function':
        text = `\\${n.name}\\left(${n.argument ? child(n.argument, 'argument') : '\\square'}\\right)`;
        break;
      case 'root':
        text = `\\sqrt{${n.argument ? child(n.argument, 'argument') : '\\square'}}`;
        break;
      case 'derivative':
        text = `\\frac{d}{d${n.variable}}${n.expression ? `\\left(${child(n.expression, 'expression')}\\right)` : ''}`;
        break;
      case 'integral':
        text = `\\int ${n.expression ? child(n.expression, 'expression') : ''}\\,d${n.variable}`;
        break;
      case 'operator':
        text = n.left
          ? `${grouped(n.left, 'left')}\,${operatorLatex[n.operator]}\,\\square`
          : toLatex(n);
        break;
      default:
        text = toLatex(n);
    }
    if (!path.length) return text;
    const key = encodePath(path);
    const attributes = [
      `node-path=${key}`,
      ...(n.kind === 'hole' ? ['hole=true'] : []),
      ...(key === options.selected ? ['part-selected=true'] : []),
      ...(key === options.target ? ['part-target=true'] : []),
    ];
    return `\\htmlData{${attributes.join(',')}}{${text}}`;
  };
  const content = render(node, options.prefix ?? []);
  return options.parenthesized ? `\\left(${content}\\right)` : content;
}
