import type { PointerEvent, MouseEvent } from 'react';
import type { Expression } from '../ast/types';
import type { WorldObject } from '../store/types';
import { MathText } from './MathText';
import { VectorView } from './VectorView';
import { toLatex } from '../ast/latex';
import { decodePath, type ExpressionPath } from '../ast/parts';

export function WorldElement({
  object,
  selected,
  magnetic,
  dragging,
  displayNode,
  busy,
  onPointerDown,
  onDoubleClick,
  onContextMenu,
  onEndpoint,
  onExponent,
  onPartPointerDown,
  selectedPart,
  targetPart,
}: {
  object: WorldObject;
  selected: boolean;
  magnetic?: boolean;
  dragging?: boolean;
  displayNode?: Expression;
  busy?: boolean;
  onPointerDown: (event: PointerEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (event: MouseEvent) => void;
  onEndpoint?: (event: PointerEvent, endpoint: 'start' | 'end') => void;
  onExponent?: () => void;
  onPartPointerDown?: (event: PointerEvent, path: ExpressionPath) => void;
  selectedPart?: string;
  targetPart?: string;
}) {
  const node = displayNode ?? object.node;
  return (
    <div
      className={`world-element ${node.kind === 'vector' ? 'is-vector' : ''} ${object.body ? 'is-body' : ''} ${selected ? 'selected' : ''} ${magnetic ? 'magnetic' : ''} ${dragging ? 'dragging' : ''} ${busy ? 'reacting' : ''}`}
      style={{
        left: object.x,
        top: object.y,
        rotate: object.rotation ? `${-object.rotation}deg` : undefined,
      }}
      data-object-id={object.id}
      data-kind={object.node.kind}
      data-testid="world-element"
      tabIndex={0}
      role="group"
      aria-label={object.body ? `物体 ${object.body.mass} kg` : `数式 ${toLatex(object.node)}`}
      onPointerDown={(e) => {
        const part = (e.target as Element).closest('[data-node-path]');
        const path = decodePath(part?.getAttribute('data-node-path') ?? null);
        if (path.length && onPartPointerDown && !busy) onPartPointerDown(e, path);
        else onPointerDown(e);
      }}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {object.body ? (
        <div className="body-dot">
          <span>m</span>
          <small>{object.body.mass} kg</small>
        </div>
      ) : node.kind === 'vector' ? (
        <VectorView
          node={node}
          parts={object.vectorParts}
          selected={selected}
          onEndpoint={onEndpoint}
        />
      ) : node.kind === 'power' && !busy ? (
        <span className="selectable-power">
          <MathText
            node={node.base}
            interactive={{
              prefix: ['base'],
              selected: selectedPart,
              target: targetPart,
              parenthesized:
                ['add', 'subtract', 'multiply', 'divide', 'power'].includes(node.base.kind) ||
                (node.base.kind === 'number' && node.base.value < 0),
            }}
          />
          <button
            className="exponent"
            aria-label="指数を選択"
            title="指数を選択"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onExponent?.();
            }}
          >
            <MathText node={node.exponent} />
          </button>
        </span>
      ) : (
        <MathText
          node={node}
          interactive={busy ? undefined : { selected: selectedPart, target: targetPart }}
        />
      )}
      {magnetic && <span className="magnet-dot" />}
    </div>
  );
}
