import type { PointerEvent } from 'react';
import type { VectorNode } from '../ast/types';
import { VECTOR_SCALE } from '../utils/layout';

export function VectorView({
  node,
  selected,
  parts,
  onEndpoint,
}: {
  node: VectorNode;
  selected: boolean;
  parts?: [VectorNode, VectorNode];
  onEndpoint?: (event: PointerEvent, endpoint: 'start' | 'end') => void;
}) {
  const x = node.x * VECTOR_SCALE,
    y = -node.y * VECTOR_SCALE;
  const minX = Math.min(0, x, ...(parts ? [parts[0].x * VECTOR_SCALE] : [])) - 24;
  const minY = Math.min(0, y, ...(parts ? [-parts[0].y * VECTOR_SCALE] : [])) - 24;
  const width = Math.max(0, x, ...(parts ? [parts[0].x * VECTOR_SCALE] : [])) - minX + 36;
  const height = Math.max(0, y, ...(parts ? [-parts[0].y * VECTOR_SCALE] : [])) - minY + 36;
  const angle = (Math.atan2(y, x) * 180) / Math.PI;
  return (
    <svg
      className={`vector-view ${selected ? 'vector-selected' : ''}`}
      style={{ left: minX, top: minY, width, height }}
      viewBox={`${minX} ${minY} ${width} ${height}`}
      aria-label={`ベクトル (${node.x}, ${node.y})`}
    >
      {parts && (
        <path
          className="vector-components"
          d={`M0 0L${parts[0].x * VECTOR_SCALE} ${-parts[0].y * VECTOR_SCALE}L${x} ${y}`}
        />
      )}
      <line x1="0" y1="0" x2={x} y2={y} className="vector-shaft" />
      <line x1="0" y1="0" x2={x} y2={y} className="vector-hitarea" />
      <path
        d="M-10 -5 0 0-10 5"
        transform={`translate(${x} ${y}) rotate(${angle})`}
        className="vector-arrow"
      />
      <circle cx="0" cy="0" r="3" className="vector-origin" />
      <text x={x / 2 + 10} y={y / 2 - 12} className="vector-name">
        v
      </text>
      {selected && (
        <>
          <circle
            cx="0"
            cy="0"
            r="8"
            className="vector-handle"
            data-testid="vector-start"
            onPointerDown={(e) => onEndpoint?.(e, 'start')}
          />
          <circle
            cx={x}
            cy={y}
            r="8"
            className="vector-handle"
            data-testid="vector-end"
            onPointerDown={(e) => onEndpoint?.(e, 'end')}
          />
        </>
      )}
    </svg>
  );
}
