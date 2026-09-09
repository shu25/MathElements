import {
  add,
  div,
  equation,
  fn,
  matrix,
  mul,
  num,
  pow,
  quantity,
  variable,
  vector,
  type Expression,
} from '../ast/types';
import { useGameStore } from '../store/useGameStore';
import { defaultBody } from '../physics/model';
import { uid, type Bounds } from '../utils/layout';
import { MathText } from './MathText';
import { Icon } from './Icon';

const x = variable();
const experiments: {
  label: string;
  formula: string;
  nodes: Expression[];
  physics?: boolean;
  grid?: boolean;
}[] = [
  {
    label: '同類項を集める',
    formula: '2x+3x',
    nodes: [mul(num(2), x), { kind: 'operator', operator: 'add' }, mul(num(3), x)],
  },
  {
    label: 'つり合いを動かす',
    formula: '2x+3=7',
    nodes: [equation(add(mul(num(2), x), num(3)), num(7))],
  },
  {
    label: '分数を足す',
    formula: '\\frac12+\\frac13',
    nodes: [add(div(num(1), num(2)), div(num(1), num(3)))],
  },
  {
    label: '変化を見つける',
    formula: '\\frac{d}{dx}(x^3)',
    nodes: [pow(x, num(3)), { kind: 'derivative', expression: null, variable: 'x' }, fn('sin', x)],
  },
  {
    label: '矢印と空間',
    formula: 'A\\vec{v}',
    nodes: [
      vector(3, 1),
      matrix([
        [2, 0],
        [0, 1],
      ]),
    ],
    grid: true,
  },
  {
    label: '放物線を描く',
    formula: 'y=v_0t\\sin\\theta-\\frac12gt^2',
    nodes: [quantity('mass')],
    physics: true,
  },
];
export function Experiments({ bounds, onClose }: { bounds: Bounds; onClose: () => void }) {
  const launch = (index: number) => {
    const e = experiments[index],
      state = useGameStore.getState();
    if (state.mode !== 'sandbox') state.setMode('sandbox');
    useGameStore.getState().setDomain(e.physics ? 'physics' : 'math');
    const current = useGameStore.getState();
    const objects = e.nodes.map((node, i) => ({
      id: uid(),
      node: structuredClone(node),
      x: e.physics ? 120 : bounds.width * 0.42 + (i - (e.nodes.length - 1) / 2) * 180,
      y: e.physics ? bounds.height - 65 : bounds.height * 0.53,
      ...(e.physics ? { body: { ...defaultBody(), speed: 20, angle: 45, gravity: 9.81 } } : {}),
    }));
    current.commit({ grid: e.grid ? matrix() : null, objects }, null);
    current.resetSimulation();
    current.finishTutorial();
    onClose();
  };
  return (
    <div className="experiments-popover" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center">
        <span className="eyebrow">START AN EXPERIMENT</span>
        <button className="icon-button" aria-label="実験一覧を閉じる" onClick={onClose}>
          <Icon name="close" size={14} />
        </button>
      </div>
      <p>すぐに触れられる、小さな実験。</p>
      {experiments.map((e, i) => (
        <button key={e.label} className="experiment-row" onClick={() => launch(i)}>
          <span>{e.label}</span>
          <MathText latex={e.formula} />
          <Icon name="arrow" size={14} />
        </button>
      ))}
      <small>現在の配置を置き換えます。Undo で戻せます。</small>
    </div>
  );
}
