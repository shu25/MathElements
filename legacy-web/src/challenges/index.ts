import {
  add,
  constant,
  div,
  equation,
  mul,
  num,
  pow,
  quantity,
  variable,
  vector,
  type Expression,
} from '../ast/types';
import { equivalent } from '../algebra/simplify';
import type { Domain, WorldObject } from '../store/types';

export interface Challenge {
  id: number;
  title: string;
  subtitle: string;
  hint: string;
  domain: Domain;
  seeds: Expression[];
  allowed: string[];
  target?: Expression;
  test: (objects: WorldObject[]) => boolean;
}
const x = variable();
const contains = (target: Expression) => (objects: WorldObject[]) =>
  objects.some((o) => o.node.kind === target.kind && equivalent(o.node, target));
export const challenges: Challenge[] = [
  {
    id: 1,
    title: 'はじめの一歩',
    subtitle: '1 と 1 を、足し算でつなごう。',
    hint: '+ を 1 に重ね、もうひとつの 1 を重ねます。',
    domain: 'math',
    seeds: [num(1), num(1)],
    allowed: ['1', '+'],
    target: add(num(1), num(1)),
    test: (o) =>
      o.some(
        (e) =>
          e.node.kind === 'add' &&
          e.node.terms.length === 2 &&
          e.node.terms.every((t) => t.kind === 'number' && t.value === 1),
      ),
  },
  {
    id: 2,
    title: 'ふたつから、ひとつへ',
    subtitle: '2 + 3 を、ひとつの数に。',
    hint: '+ でつないだら、式をダブルクリック。',
    domain: 'math',
    seeds: [num(2), num(3)],
    allowed: ['2', '3', '+'],
    target: num(5),
    test: contains(num(5)),
  },
  {
    id: 3,
    title: '同じものを集める',
    subtitle: 'x + x を簡約しよう。',
    hint: '+ でつなぎ、ダブルクリックで同類項をまとめます。',
    domain: 'math',
    seeds: [x, x],
    allowed: ['x', '+'],
    target: mul(num(2), x),
    test: contains(mul(num(2), x)),
  },
  {
    id: 4,
    title: '係数のかけら',
    subtitle: '2x + 3x を簡約しよう。',
    hint: '足すのは x の個数。ふたつの項を + でつなぎます。',
    domain: 'math',
    seeds: [mul(num(2), x), mul(num(3), x)],
    allowed: ['+'],
    target: mul(num(5), x),
    test: contains(mul(num(5), x)),
  },
  {
    id: 5,
    title: 'つり合いを保つ',
    subtitle: '3x + 5 = 20。x をひとりにしよう。',
    hint: '方程式を選択し、両辺から 5 を引き、両辺を 3 で割ります。',
    domain: 'math',
    seeds: [equation(add(mul(num(3), x), num(5)), num(20))],
    allowed: ['−', '÷', '3', '5'],
    target: equation(x, num(5)),
    test: contains(equation(x, num(5))),
  },
  {
    id: 6,
    title: '共通のものさし',
    subtitle: '1/2 と 1/3 を足そう。',
    hint: '+ でつないでダブルクリック。通分の途中式に注目。',
    domain: 'math',
    seeds: [div(num(1), num(2)), div(num(1), num(3))],
    allowed: ['+'],
    target: div(num(5), num(6)),
    test: contains(div(num(5), num(6))),
  },
  {
    id: 7,
    title: '変化をつかむ',
    subtitle: 'x² を x で微分しよう。',
    hint: 'd/dx を x² にドラッグ。指数が係数になります。',
    domain: 'math',
    seeds: [pow(x, num(2))],
    allowed: ['d/dx'],
    target: mul(num(2), x),
    test: contains(mul(num(2), x)),
  },
  {
    id: 8,
    title: '変化をたどる',
    subtitle: '2x を x で積分しよう。',
    hint: '∫ dx を重ねます。積分定数 C も答えの一部。',
    domain: 'math',
    seeds: [mul(num(2), x)],
    allowed: ['∫ dx'],
    target: add(pow(x, num(2)), constant('C')),
    test: contains(add(pow(x, num(2)), constant('C'))),
  },
  {
    id: 9,
    title: '矢印をつなぐ',
    subtitle: '(3, 1) と (1, 2) の合成ベクトルを作ろう。',
    hint: '一方の始点を、もう一方の終点に重ねます。',
    domain: 'math',
    seeds: [vector(3, 1), vector(1, 2)],
    allowed: ['+'],
    target: vector(4, 3),
    test: contains(vector(4, 3)),
  },
  {
    id: 10,
    title: '放物線の向こう',
    subtitle: '初速 20 m/s・角度 45° で、40.77 m 先の目標へ。',
    hint: '物体を選択して初速・角度・重力 9.81 を設定し、再生します。',
    domain: 'physics',
    seeds: [quantity('mass')],
    allowed: ['velocity', 'gravity'],
    test: () => false,
  },
];
