import {
  add,
  div,
  equation,
  isScalar,
  mul,
  num,
  op,
  pow,
  same,
  sub,
  type BinaryOperator,
  type EquationNode,
  type Expression,
  type PhysicsQuantityNode,
} from '../ast/types';
import { evaluate } from '../algebra/evaluate';
import { expand, linearParts, simplify } from '../algebra/simplify';
import { asRational, lcm } from '../algebra/rational';
import { differentiate, integrate } from '../calculus';
import { addVectors, transformVector } from '../physics/model';
import {
  children,
  getPart,
  hasHole,
  isIncomplete,
  replacePart,
  type ExpressionPath,
} from '../ast/parts';

export interface ReactionContext {
  targetIsBody?: boolean;
  vectorJoin?: boolean;
}
export interface ReactionResult {
  result: Expression;
  intermediate?: Expression;
  explanation?: string;
  quantity?: PhysicsQuantityNode;
}
export interface ReactionRule {
  id: string;
  matches: (a: Expression, b: Expression, context: ReactionContext) => boolean;
  react: (a: Expression, b: Expression, context: ReactionContext) => ReactionResult | null;
}

function binary(operator: BinaryOperator, left: Expression, right: Expression): Expression | null {
  if (left.kind === 'vector' && right.kind === 'vector' && operator === 'add')
    return addVectors(left, right);
  if (left.kind === 'matrix' && right.kind === 'vector' && operator === 'multiply')
    return transformVector(left, right);
  if (!isScalar(left) || !isScalar(right)) return null;
  const expressions = {
    add: add(left, right),
    subtract: sub(left, right),
    multiply: mul(left, right),
    divide: div(left, right),
    power: pow(left, right),
    equal: equation(left, right),
  };
  const result = expressions[operator];
  evaluate(result); // Reject known invalid domains before consuming any objects.
  return result;
}
function completeOperator(tool: Expression, operand: Expression): ReactionResult | null {
  if (tool.kind !== 'operator') return null;
  if (
    operand.kind === 'equation' &&
    tool.left &&
    ['add', 'subtract', 'multiply', 'divide'].includes(tool.operator)
  )
    return operateEquation(operand, tool.operator as EquationOperation, tool.left);
  if (!tool.left)
    return isScalar(operand) || operand.kind === 'vector' || operand.kind === 'matrix'
      ? { result: op(tool.operator, operand) }
      : null;
  const expression = binary(tool.operator, tool.left, operand);
  if (!expression) return null;
  if (tool.operator === 'multiply')
    return { result: simplify(expression), intermediate: expression, explanation: '積をまとめる' };
  return { result: expression };
}

const builtInRules: ReactionRule[] = [
  {
    id: 'fill-hole',
    matches: (a, b) => a.kind === 'hole' && isScalar(b),
    react: (_a, b) => ({ result: b, explanation: '空いた場所に入れる' }),
  },
  {
    id: 'physics-attachment',
    matches: (a, b, c) =>
      Boolean(
        c.targetIsBody &&
        a.kind === 'quantity' &&
        a.quantity === 'mass' &&
        b.kind === 'quantity' &&
        [
          'mass',
          'force',
          'velocity',
          'acceleration',
          'gravity',
          'friction',
          'drag',
          'lift',
          'buoyancy',
          'wind',
          'bounce',
        ].includes(b.quantity),
      ),
    react: (a, b) =>
      b.kind === 'quantity'
        ? {
            result: a,
            quantity: b,
            explanation: b.quantity === 'force' ? 'F = ma · 力を加える' : '物体の条件を変更',
          }
        : null,
  },
  {
    id: 'operator',
    matches: (a, b) => a.kind === 'operator' || b.kind === 'operator',
    react: (a, b) => (a.kind === 'operator' ? completeOperator(a, b) : completeOperator(b, a)),
  },
  {
    id: 'unary-function',
    matches: (a, b) =>
      [a, b].some((n) => (n.kind === 'root' || n.kind === 'function') && !n.argument),
    react: (a, b) => {
      const isTool = (n: Expression) => (n.kind === 'root' || n.kind === 'function') && !n.argument;
      const tool = isTool(a) ? a : b,
        operand = tool === a ? b : a;
      if ((tool.kind !== 'root' && tool.kind !== 'function') || !isScalar(operand)) return null;
      const result = { ...tool, argument: operand };
      evaluate(result);
      return { result };
    },
  },
  {
    id: 'calculus',
    matches: (a, b) =>
      [a, b].some((n) => (n.kind === 'derivative' || n.kind === 'integral') && !n.expression),
    react: (a, b) => {
      const tool = (a.kind === 'derivative' || a.kind === 'integral') && !a.expression ? a : b;
      const operand = tool === a ? b : a;
      if ((tool.kind !== 'derivative' && tool.kind !== 'integral') || !isScalar(operand))
        return null;
      const intermediate = { ...tool, expression: operand };
      return {
        intermediate,
        result:
          tool.kind === 'derivative'
            ? differentiate(operand, tool.variable)
            : integrate(operand, tool.variable),
        explanation:
          tool.kind === 'derivative'
            ? `${tool.variable}について微分`
            : '不定積分 · 積分定数 C を加える',
      };
    },
  },
  {
    id: 'vector-add',
    matches: (a, b) => a.kind === 'vector' && b.kind === 'vector',
    react: (a, b) =>
      a.kind === 'vector' && b.kind === 'vector'
        ? { result: addVectors(a, b), explanation: 'ベクトルの成分を加える' }
        : null,
  },
  {
    id: 'matrix-vector',
    matches: (a, b) =>
      (a.kind === 'matrix' && b.kind === 'vector') || (a.kind === 'vector' && b.kind === 'matrix'),
    react: (a, b) =>
      a.kind === 'matrix' && b.kind === 'vector'
        ? { result: transformVector(a, b), explanation: '行列による線形変換' }
        : b.kind === 'matrix' && a.kind === 'vector'
          ? { result: transformVector(b, a), explanation: '行列による線形変換' }
          : null,
  },
  {
    id: 'implicit-multiplication',
    matches: (a, b) => isScalar(a) && isScalar(b),
    react: (a, b) => {
      const intermediate = mul(a, b);
      return { result: simplify(intermediate), intermediate, explanation: '重ねると掛け算' };
    },
  },
];

export type EquationOperation = 'add' | 'subtract' | 'multiply' | 'divide';
export function operateEquation(
  eq: EquationNode,
  operation: EquationOperation,
  operand: Expression,
): ReactionResult | null {
  if (!isScalar(operand)) return null;
  const value = evaluate(operand);
  // Multiplication/division must be reversible: require a known nonzero scalar.
  if ((operation === 'multiply' || operation === 'divide') && (value === null || value === 0))
    return null;
  const left = binary(operation, eq.left, operand),
    right = binary(operation, eq.right, operand);
  if (!left || !right) return null;
  const intermediate = equation(left, right);
  return { intermediate, result: simplify(intermediate), explanation: `両辺に同じ操作を適用` };
}
export function nextEquationStep(
  eq: EquationNode,
): { operation: EquationOperation; operand: Expression; label: string } | null {
  const left = linearParts(eq.left),
    right = linearParts(eq.right);
  if (!left || !right) return null;
  if (right.a !== 0)
    return {
      operation: 'subtract',
      operand: simplify(mul(num(right.a), { kind: 'variable', name: 'x' })),
      label: '右辺の x 項を両辺から引く',
    };
  if (left.b !== 0)
    return { operation: 'subtract', operand: num(left.b), label: `両辺から ${left.b} を引く` };
  if (left.a !== 0 && left.a !== 1)
    return { operation: 'divide', operand: num(left.a), label: `両辺を ${left.a} で割る` };
  return null;
}
export function simplifySteps(expression: Expression): ReactionResult {
  if (isIncomplete(expression))
    return { result: expression, explanation: '□ に数や式を入れてください' };
  if (expression.kind === 'derivative' && expression.expression)
    return { result: differentiate(expression.expression, expression.variable) };
  if (expression.kind === 'integral' && expression.expression)
    return { result: integrate(expression.expression, expression.variable) };
  if (expression.kind === 'add' && expression.terms.length === 2) {
    const [a, b] = expression.terms.map(asRational);
    if (a && b && a.d !== b.d) {
      const denominator = lcm(a.d, b.d);
      if (
        denominator <= BigInt(Number.MAX_SAFE_INTEGER) &&
        [a.n * (denominator / a.d), b.n * (denominator / b.d)].every(
          (n) => n <= BigInt(Number.MAX_SAFE_INTEGER) && n >= -BigInt(Number.MAX_SAFE_INTEGER),
        )
      ) {
        const intermediate = add(
          div(num(Number(a.n * (denominator / a.d))), num(Number(denominator))),
          div(num(Number(b.n * (denominator / b.d))), num(Number(denominator))),
        );
        return {
          intermediate,
          result: simplify(expression),
          explanation: `分母を最小公倍数 ${denominator} にそろえる`,
        };
      }
    }
  }
  return { result: simplify(expression), explanation: '同じ意味のまま、よりシンプルに' };
}

export class ReactionEngine {
  private rules: ReactionRule[] = [...builtInRules];
  register(rule: ReactionRule) {
    this.rules.unshift(rule);
  }
  combine(a: Expression, b: Expression, context: ReactionContext = {}): ReactionResult | null {
    try {
      const rule = this.rules.find((r) => r.matches(a, b, context));
      return rule?.react(a, b, context) ?? null;
    } catch {
      return null;
    }
  }
  canCombine(a: Expression, b: Expression, context: ReactionContext = {}): boolean {
    return this.combine(a, b, context) !== null;
  }
  simplify = simplify;
  simplifySteps = simplifySteps;
  expand = expand;
  differentiate = differentiate;
  integrate = integrate;
  evaluate = evaluate;
  unchanged = same;
}
export const engine = new ReactionEngine();

export function combinePart(
  expression: Expression,
  path: ExpressionPath,
  incoming: Expression,
): ReactionResult | null {
  const target = getPart(expression, path);
  if (!target) return null;
  const reaction = engine.combine(target, incoming);
  if (!reaction) return null;
  try {
    const result = replacePart(expression, path, reaction.result);
    const validate = (n: Expression): void => {
      children(n).forEach((c) => validate(c.node));
      if (!hasHole(n)) evaluate(n);
    };
    validate(result);
    return {
      ...reaction,
      result,
      intermediate: reaction.intermediate
        ? replacePart(expression, path, reaction.intermediate)
        : undefined,
    };
  } catch {
    return null;
  }
}
