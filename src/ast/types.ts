export interface HoleNode {
  kind: 'hole';
}
export interface NumberNode {
  kind: 'number';
  value: number;
}
export interface VariableNode {
  kind: 'variable';
  name: string;
}
export interface ConstantNode {
  kind: 'constant';
  name: 'pi' | 'e' | 'C';
}
export type BinaryOperator = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'equal';
export interface OperatorNode {
  kind: 'operator';
  operator: BinaryOperator;
  left?: Expression;
}
export interface AddNode {
  kind: 'add';
  terms: Expression[];
}
export interface SubtractNode {
  kind: 'subtract';
  left: Expression;
  right: Expression;
}
export interface MultiplyNode {
  kind: 'multiply';
  factors: Expression[];
}
export interface DivideNode {
  kind: 'divide';
  numerator: Expression;
  denominator: Expression;
}
export interface PowerNode {
  kind: 'power';
  base: Expression;
  exponent: Expression;
}
export interface RootNode {
  kind: 'root';
  argument: Expression | null;
}
export interface EquationNode {
  kind: 'equation';
  left: Expression;
  right: Expression;
}
export type FunctionName = 'sin' | 'cos' | 'tan' | 'log' | 'ln' | 'exp';
export interface FunctionNode {
  kind: 'function';
  name: FunctionName;
  argument: Expression | null;
}
export interface DerivativeNode {
  kind: 'derivative';
  expression: Expression | null;
  variable: string;
}
export interface IntegralNode {
  kind: 'integral';
  expression: Expression | null;
  variable: string;
}
export interface VectorNode {
  kind: 'vector';
  x: number;
  y: number;
}
export type Matrix2 = [[number, number], [number, number]];
export interface MatrixNode {
  kind: 'matrix';
  values: Matrix2;
}
export type Quantity =
  'mass' | 'force' | 'velocity' | 'acceleration' | 'gravity' | 'time' | 'distance';
export interface PhysicsQuantityNode {
  kind: 'quantity';
  quantity: Quantity;
  value: number;
  angle: number;
}
export type Expression =
  | HoleNode
  | NumberNode
  | VariableNode
  | ConstantNode
  | OperatorNode
  | AddNode
  | SubtractNode
  | MultiplyNode
  | DivideNode
  | PowerNode
  | RootNode
  | EquationNode
  | FunctionNode
  | DerivativeNode
  | IntegralNode
  | VectorNode
  | MatrixNode
  | PhysicsQuantityNode;

export const num = (value: number): NumberNode => {
  if (!Number.isFinite(value)) throw new Error('有限の数を指定してください');
  return { kind: 'number', value: Object.is(value, -0) ? 0 : value };
};
export const variable = (name = 'x'): VariableNode => ({ kind: 'variable', name });
export const constant = (name: ConstantNode['name']): ConstantNode => ({ kind: 'constant', name });
export const op = (operator: BinaryOperator, left?: Expression): OperatorNode => ({
  kind: 'operator',
  operator,
  ...(left ? { left } : {}),
});
export const add = (...terms: Expression[]): AddNode => ({ kind: 'add', terms });
export const sub = (left: Expression, right: Expression): SubtractNode => ({
  kind: 'subtract',
  left,
  right,
});
export const mul = (...factors: Expression[]): MultiplyNode => ({ kind: 'multiply', factors });
export const div = (numerator: Expression, denominator: Expression): DivideNode => ({
  kind: 'divide',
  numerator,
  denominator,
});
export const pow = (base: Expression, exponent: Expression): PowerNode => ({
  kind: 'power',
  base,
  exponent,
});
export const equation = (left: Expression, right: Expression): EquationNode => ({
  kind: 'equation',
  left,
  right,
});
export const fn = (name: FunctionName, argument: Expression | null = null): FunctionNode => ({
  kind: 'function',
  name,
  argument,
});
export const vector = (x: number, y: number): VectorNode => ({ kind: 'vector', x, y });
export const matrix = (
  values: Matrix2 = [
    [1, 0],
    [0, 1],
  ],
): MatrixNode => ({ kind: 'matrix', values });
export const derivative = (expression: Expression | null = null, v = 'x'): DerivativeNode => ({
  kind: 'derivative',
  expression,
  variable: v,
});
export const integral = (expression: Expression | null = null, v = 'x'): IntegralNode => ({
  kind: 'integral',
  expression,
  variable: v,
});
export const root = (argument: Expression | null = null): RootNode => ({ kind: 'root', argument });
export const quantity = (quantity: Quantity, value = 1, angle = 0): PhysicsQuantityNode => ({
  kind: 'quantity',
  quantity,
  value,
  angle,
});
export const same = (a: Expression, b: Expression): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

export function isScalar(n: Expression): boolean {
  switch (n.kind) {
    case 'hole':
    case 'operator':
    case 'equation':
    case 'vector':
    case 'matrix':
    case 'quantity':
      return false;
    case 'function':
    case 'root':
      return n.argument !== null && isScalar(n.argument);
    case 'derivative':
    case 'integral':
      return n.expression !== null && isScalar(n.expression);
    case 'add':
      return n.terms.every(isScalar);
    case 'multiply':
      return n.factors.every(isScalar);
    case 'subtract':
      return isScalar(n.left) && isScalar(n.right);
    case 'divide':
      return isScalar(n.numerator) && isScalar(n.denominator);
    case 'power':
      return isScalar(n.base) && isScalar(n.exponent);
    default:
      return true;
  }
}

// Validate persisted data at the boundary; depth and size limits prevent malformed trees.
export function isExpression(value: unknown, depth = 0): value is Expression {
  if (depth > 48 || !value || typeof value !== 'object') return false;
  const n = value as Record<string, unknown>;
  const child = (v: unknown) => isExpression(v, depth + 1);
  const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const name = (v: unknown) => typeof v === 'string' && /^[a-zA-Z][a-zA-Z0-9]{0,15}$/.test(v);
  const list = (v: unknown) =>
    Array.isArray(v) && v.length > 0 && v.length <= 100 && v.every(child);
  switch (n.kind) {
    case 'hole':
      return true;
    case 'number':
      return finite(n.value);
    case 'variable':
      return name(n.name);
    case 'constant':
      return ['pi', 'e', 'C'].includes(String(n.name));
    case 'operator':
      return (
        ['add', 'subtract', 'multiply', 'divide', 'power', 'equal'].includes(String(n.operator)) &&
        (n.left === undefined || child(n.left))
      );
    case 'add':
      return list(n.terms);
    case 'multiply':
      return list(n.factors);
    case 'subtract':
    case 'equation':
      return child(n.left) && child(n.right);
    case 'divide':
      return child(n.numerator) && child(n.denominator);
    case 'power':
      return child(n.base) && child(n.exponent);
    case 'root':
      return n.argument === null || child(n.argument);
    case 'function':
      return (
        ['sin', 'cos', 'tan', 'log', 'ln', 'exp'].includes(String(n.name)) &&
        (n.argument === null || child(n.argument))
      );
    case 'derivative':
    case 'integral':
      return name(n.variable) && (n.expression === null || child(n.expression));
    case 'vector':
      return finite(n.x) && finite(n.y) && Math.abs(n.x) <= 10000 && Math.abs(n.y) <= 10000;
    case 'matrix':
      return (
        Array.isArray(n.values) &&
        n.values.length === 2 &&
        n.values.every(
          (r) =>
            Array.isArray(r) && r.length === 2 && r.every((v) => finite(v) && Math.abs(v) <= 1000),
        )
      );
    case 'quantity':
      return (
        ['mass', 'force', 'velocity', 'acceleration', 'gravity', 'time', 'distance'].includes(
          String(n.quantity),
        ) &&
        finite(n.value) &&
        finite(n.angle)
      );
    default:
      return false;
  }
}
