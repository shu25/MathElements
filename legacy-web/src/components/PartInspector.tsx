import type { WorldObject } from '../store/types';
import { children, getPart, type ExpressionPath } from '../ast/parts';
import { useGameStore } from '../store/useGameStore';
import { MathText } from './MathText';
import { Icon } from './Icon';
import type { Bounds } from '../utils/layout';

export function PartInspector({ object, bounds }: { object: WorldObject; bounds: Bounds }) {
  const state = useGameStore();
  const path = state.selected === object.id ? (state.selectedPart ?? []) : [];
  const part = getPart(object.node, path) ?? object.node;
  const items = children(part);
  const choose = (next: ExpressionPath) =>
    next.length ? state.selectPart(object.id, next) : state.select(object.id);
  if (!path.length && !items.length) return null;
  return (
    <section className="part-inspector" data-testid="part-inspector">
      <div className="part-heading">
        <span>{path.length ? '選んだ部分' : '中身を選ぶ'}</span>
        {path.length > 0 && (
          <button onClick={() => choose(path.slice(0, -1))}>ひとつ外側へ ↗</button>
        )}
      </div>
      {path.length > 0 && (
        <>
          <div className="part-formula">
            <MathText node={part} />
          </div>
          {part.kind === 'hole' ? (
            <p className="inspector-hint">数や式をここに重ねて入れます。</p>
          ) : (
            <>
              <button
                className="text-action"
                onClick={() => state.extractPart(object.id, path, bounds)}
              >
                中身を取り出す <Icon name="arrow" size={14} />
              </button>
              {items.length > 0 && (
                <button
                  className="text-action"
                  onClick={() => state.extractPart(object.id, path, bounds, undefined, true)}
                >
                  中身を分解する <Icon name="split" size={14} />
                </button>
              )}
              <button className="text-action" onClick={() => state.simplifyPart(object.id, path)}>
                この部分を簡約する <Icon name="check" size={14} />
              </button>
            </>
          )}
        </>
      )}
      {items.length > 0 && (
        <div className="part-list">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => choose([...path, item.key])}
              aria-label={`${item.label}を選択`}
            >
              <span>{item.label}</span>
              <MathText node={item.node} />
            </button>
          ))}
        </div>
      )}
      <p className="inspector-hint">
        中身をクリックで選び、ドラッグで取り出せます。
        <br />
        式全体は枠の余白をドラッグ。
      </p>
    </section>
  );
}
