import { useRef, useState, type PointerEvent } from 'react';
import {
  constant,
  derivative,
  fn,
  integral,
  matrix,
  num,
  op,
  quantity,
  root,
  variable,
  vector,
  type Expression,
} from '../ast/types';
import { useGameStore } from '../store/useGameStore';
import { challenges } from '../challenges';
import { MathText } from './MathText';

export interface TrayElement {
  key: string;
  node: Expression;
  label: string;
}
const basics: TrayElement[] = [
  ...[1, 2, 3].map((n) => ({ key: String(n), node: num(n), label: String(n) })),
  ...['x', 'y'].map((n) => ({ key: n, node: variable(n), label: `変数 ${n}` })),
  ...(
    [
      ['+', 'add', '足す'],
      ['−', 'subtract', '引く'],
      ['×', 'multiply', '掛ける'],
      ['÷', 'divide', '割る'],
      ['=', 'equal', '等号'],
      ['^', 'power', 'べき乗'],
    ] as const
  ).map(([key, name, label]) => ({ key, node: op(name), label })),
  { key: '√', node: root(), label: '平方根' },
  { key: 'π', node: constant('pi'), label: '円周率' },
  ...[0, 4, 5, 6, 7, 8, 9].map((n) => ({ key: String(n), node: num(n), label: String(n) })),
  { key: 'e', node: constant('e'), label: 'ネイピア数' },
];
const functions: TrayElement[] = ['sin', 'cos', 'tan', 'log', 'ln', 'exp'].map((name) => ({
  key: name,
  node: fn(name as 'sin'),
  label: `${name} 関数`,
}));
const calculus: TrayElement[] = [
  { key: 'd/dx', node: derivative(), label: 'x で微分' },
  { key: '∫ dx', node: integral(), label: 'x で積分' },
  { key: 'C', node: constant('C'), label: '積分定数' },
  ...functions,
  { key: 'e', node: constant('e'), label: 'ネイピア数' },
  { key: 'x', node: variable(), label: '変数 x' },
  { key: '^', node: op('power'), label: 'べき乗' },
  { key: '2', node: num(2), label: '2' },
];
const geometry: TrayElement[] = [
  { key: 'vector', node: vector(3, 2), label: 'ベクトル' },
  { key: 'matrix', node: matrix(), label: '2 × 2 行列' },
  {
    key: 'stretch',
    node: matrix([
      [2, 0],
      [0, 1],
    ]),
    label: '横方向に 2 倍',
  },
  {
    key: 'rotate',
    node: matrix([
      [0, -1],
      [1, 0],
    ]),
    label: '90° 回転',
  },
  { key: '+', node: op('add'), label: '足す' },
  { key: '×', node: op('multiply'), label: '掛ける' },
];
const physics: TrayElement[] = [
  { key: 'mass', node: quantity('mass', 1), label: 'mass · 質量を持つ物体' },
  { key: 'force', node: quantity('force', 5, 0), label: 'force · 力 5 N' },
  { key: 'velocity', node: quantity('velocity', 20, 45), label: 'velocity · 初速 20 m/s・45°' },
  {
    key: 'acceleration',
    node: quantity('acceleration', 2, 0),
    label: 'acceleration · 加速度 2 m/s²',
  },
  { key: 'gravity', node: quantity('gravity', 9.81), label: 'gravity · 重力 9.81 m/s²' },
  { key: 'time', node: quantity('time', 1), label: 'time · 時間のものさし' },
  { key: 'distance', node: quantity('distance', 10), label: 'distance · 距離のものさし' },
];
const categories = [
  { id: 'basics', label: '基本' },
  { id: 'functions', label: '関数' },
  { id: 'calculus', label: '微積分' },
  { id: 'geometry', label: 'ベクトル・行列' },
] as const;
export function Tray({ onDrag }: { onDrag: (event: PointerEvent, item: TrayElement) => void }) {
  const [category, setCategory] = useState('basics');
  const rail = useRef<HTMLDivElement>(null);
  const domain = useGameStore((s) => s.domain),
    mode = useGameStore((s) => s.mode),
    active = useGameStore((s) => s.activeChallenge);
  const tutorialComplete = useGameStore((s) => s.tutorialComplete),
    step = useGameStore((s) => s.tutorialStep);
  const all = [...basics, ...functions, ...calculus, ...geometry, ...physics];
  let items =
    domain === 'physics'
      ? physics
      : ({ basics, functions, calculus, geometry }[category] ?? basics);
  if (mode === 'challenges')
    items = challenges[active - 1].allowed
      .map((key) => all.find((i) => i.key === key)!)
      .filter(Boolean);
  return (
    <footer className="element-tray">
      <div className="tray-heading flex items-center justify-between">
        <div className="flex items-center gap-7">
          <span className="eyebrow">ELEMENTS</span>
          {mode === 'sandbox' && domain === 'math' && (
            <div className="tray-tabs flex items-center gap-5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={category === c.id ? 'active' : ''}
                  onClick={() => {
                    setCategory(c.id);
                    rail.current?.scrollTo({ left: 0 });
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
          {domain === 'physics' && <span className="tray-caption">NEWTONIAN PHYSICS</span>}
        </div>
        <span className="tray-caption">
          DRAG TO DISCOVER <span className="ml-3">↗</span>
        </span>
      </div>
      <div
        className="tray-rail"
        ref={rail}
        onWheel={(e) => {
          if (rail.current && Math.abs(e.deltaY) > Math.abs(e.deltaX))
            rail.current.scrollLeft += e.deltaY;
        }}
      >
        {items.map((item) => (
          <button
            key={item.key}
            data-testid={`tray-${item.key}`}
            aria-label={item.label}
            title={item.label}
            className={`tray-element ${!tutorialComplete && mode === 'sandbox' && domain === 'math' && ['2', '+', '3'][step] === item.key ? 'suggested' : ''} ${domain === 'physics' ? 'physics-tray-element' : ''}`}
            onPointerDown={(e) => onDrag(e, item)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const stage = document.querySelector('.workspace')?.getBoundingClientRect();
                useGameStore
                  .getState()
                  .addObject(
                    item.node,
                    (stage?.width ?? 1000) / 2,
                    (stage?.height ?? 500) / 2,
                    stage ? { width: stage.width, height: stage.height } : undefined,
                    item.key,
                  );
              }
            }}
          >
            <MathText node={item.node} />
            {domain === 'physics' && <span className="quantity-label">{item.key}</span>}
          </button>
        ))}
      </div>
      <div className="tray-footnote flex justify-between">
        <span>記号をドラッグ。重ねて、つなげて、発見する。</span>
        <span>
          DOUBLE CLICK <span className="shortcut-separator">/</span> 簡約{' '}
          <span className="shortcut-separator">·</span> RIGHT CLICK{' '}
          <span className="shortcut-separator">/</span> 分解
        </span>
      </div>
    </footer>
  );
}
