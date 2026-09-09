import { useState } from 'react';
import { matrix, num, type Expression, type Matrix2 } from '../ast/types';
import type { WorldObject } from '../store/types';
import type { MotionState } from '../physics/model';
import { useGameStore } from '../store/useGameStore';
import { evaluate } from '../algebra/evaluate';
import { nextEquationStep } from '../engine/ReactionEngine';
import { BodyInspector } from './BodyInspector';
import { PartInspector } from './PartInspector';
import { NumberField } from './NumberField';
import { MathText } from './MathText';
import { Icon } from './Icon';
import type { Bounds } from '../utils/layout';

const format = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 3 }) : '—';
export function Inspector({
  object,
  motion,
  exponent,
  onCloseExponent,
  bounds,
}: {
  object: WorldObject;
  motion?: MotionState;
  exponent: boolean;
  onCloseExponent: () => void;
  bounds: Bounds;
}) {
  const actions = useGameStore(),
    node = object.node;
  const [showApproximation, setShowApproximation] = useState(false);
  const busy = Boolean(actions.transitions[object.id]);
  let approximate: number | null = null;
  try {
    approximate = evaluate(node);
  } catch {
    /* Display remains symbolic for invalid domains. */
  }
  const update = (next: Expression) => actions.updateNode(object.id, next);
  const step = node.kind === 'equation' ? nextEquationStep(node) : null;
  return (
    <aside className="inspector" data-testid="inspector" onPointerDown={(e) => e.stopPropagation()}>
      <div className="inspector-title flex justify-between items-center">
        <span className="eyebrow">
          {object.body
            ? 'OBJECT'
            : exponent
              ? 'EXPONENT'
              : ((
                  {
                    vector: 'VECTOR',
                    matrix: 'MATRIX',
                    equation: 'EQUATION',
                    quantity: 'QUANTITY',
                  } as Record<string, string>
                )[node.kind] ?? 'EXPRESSION')}
        </span>
        <button
          className="icon-button"
          aria-label="選択を解除"
          onClick={() => actions.select(null)}
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      {exponent && node.kind === 'power' ? (
        <>
          <div className="inspector-formula">
            <MathText node={node.exponent} />
          </div>
          {node.exponent.kind === 'number' && (
            <NumberField
              label="指数"
              value={node.exponent.value}
              min={-32}
              max={32}
              onChange={(value) => update({ ...node, exponent: num(value) })}
            />
          )}
          <button className="text-action" onClick={onCloseExponent}>
            式全体を選択 <Icon name="arrow" size={14} />
          </button>
        </>
      ) : (
        <>
          {!object.body && (
            <div className="inspector-formula">
              <MathText node={node} />
            </div>
          )}
          {object.body && <BodyInspector id={object.id} body={object.body} motion={motion} />}
          {!object.body && <PartInspector object={object} bounds={bounds} />}
          {node.kind === 'vector' && (
            <div className="vector-properties">
              <NumberField
                label="x component"
                value={node.x}
                step={0.25}
                min={-15}
                max={15}
                onChange={(x) => update({ ...node, x })}
              />
              <NumberField
                label="y component"
                value={node.y}
                step={0.25}
                min={-15}
                max={15}
                onChange={(y) => update({ ...node, y })}
              />
              <div className="readout">
                <span>|v|</span>
                <span>{format(Math.hypot(node.x, node.y))}</span>
              </div>
              <div className="readout">
                <span>angle</span>
                <span>{format((Math.atan2(node.y, node.x) * 180) / Math.PI)}°</span>
              </div>
              <p className="inspector-hint">端点をドラッグして向きと長さを変える。</p>
            </div>
          )}
          {node.kind === 'matrix' && (
            <>
              <div className="matrix-editor">
                {node.values.flatMap((row, i) =>
                  row.map((value, j) => (
                    <NumberField
                      key={`${i}-${j}`}
                      label={`行列 ${i + 1},${j + 1}`}
                      value={value}
                      step={0.1}
                      min={-10}
                      max={10}
                      onChange={(n) => {
                        const values = node.values.map((r) => [...r]) as Matrix2;
                        values[i][j] = n;
                        update(matrix(values));
                      }}
                    />
                  )),
                )}
              </div>
              <button className="text-action" onClick={() => actions.applyMatrix(node)}>
                グリッドに適用 <Icon name="arrow" size={14} />
              </button>
            </>
          )}
          {node.kind === 'quantity' && !object.body && (
            <>
              <NumberField
                label="値"
                value={node.value}
                unit={
                  (
                    {
                      force: 'N',
                      acceleration: 'm/s²',
                      velocity: 'm/s',
                      gravity: 'm/s²',
                      time: 's',
                      distance: 'm',
                    } as Record<string, string>
                  )[node.quantity]
                }
                min={node.quantity === 'force' || node.quantity === 'acceleration' ? -1000 : 0}
                step={0.1}
                onChange={(value) => update({ ...node, value })}
              />
              {['force', 'velocity', 'acceleration'].includes(node.quantity) && (
                <NumberField
                  label="方向"
                  value={node.angle}
                  unit="°"
                  min={-180}
                  max={180}
                  onChange={(angle) => update({ ...node, angle })}
                />
              )}
              <p className="inspector-hint">
                {['time', 'distance'].includes(node.quantity)
                  ? 'ワークスペース上のものさし。'
                  : '物体に重ねて適用します。'}
              </p>
            </>
          )}
          {node.kind === 'equation' && (
            <div className="equation-controls">
              {step ? (
                <button
                  className="text-action equation-step"
                  disabled={busy}
                  onClick={() => actions.equationOperation(object.id, step.operation, step.operand)}
                >
                  {step.label}
                  <Icon name="arrow" size={15} />
                </button>
              ) : (
                <p className="inspector-hint">
                  {node.left.kind === 'variable'
                    ? '未知数をひとりにできました。'
                    : '− や ÷ に数を重ね、方程式に適用できます。'}
                </p>
              )}
              <span className="inspector-hint">左右に同じ操作をして、つり合いを保つ。</span>
            </div>
          )}
          {!object.body && !['vector', 'matrix', 'quantity'].includes(node.kind) && (
            <>
              <div className="expression-actions">
                <button
                  className="text-action"
                  disabled={busy}
                  onClick={() => actions.simplifyObject(object.id)}
                >
                  簡約する <span>↵</span>
                </button>
                <button
                  className="text-action"
                  disabled={busy}
                  onClick={() => actions.breakApart(object.id, bounds)}
                >
                  分解する <Icon name="split" size={15} />
                </button>
              </div>
              {approximate !== null && node.kind !== 'number' && (
                <button
                  className="approximation"
                  onClick={() => setShowApproximation(!showApproximation)}
                >
                  {showApproximation ? `≈ ${format(approximate)}` : '≈ 近似値を表示'}
                </button>
              )}
            </>
          )}
        </>
      )}
      <div className="inspector-footer">
        <button aria-label="複製" title="複製" onClick={() => actions.duplicate(object.id, bounds)}>
          <Icon name="copy" size={15} />
        </button>
        <button aria-label="削除" title="削除 · Delete" onClick={() => actions.remove(object.id)}>
          <Icon name="trash" size={15} />
        </button>
        <span>ESC TO DESELECT</span>
      </div>
    </aside>
  );
}
