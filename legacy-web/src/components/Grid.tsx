import type { MatrixNode } from '../ast/types';
import { MathText } from './MathText';

export function Grid({ matrix, highlighted }: { matrix: MatrixNode; highlighted: boolean }) {
  const [[a, b], [c, d]] = matrix.values;
  return (
    <div
      className={`coordinate-grid ${highlighted ? 'grid-target' : ''}`}
      data-testid="coordinate-grid"
    >
      <div className="grid-label">
        <span className="eyebrow">LINEAR SPACE</span>
        <MathText node={matrix} />
      </div>
      <svg viewBox="-200 -170 400 340" aria-label="行列による2D座標変換">
        <defs>
          <clipPath id="grid-clip">
            <rect x="-195" y="-165" width="390" height="330" />
          </clipPath>
        </defs>
        <g clipPath="url(#grid-clip)">
          <g className="original-grid">
            {Array.from({ length: 13 }, (_, i) => (i - 6) * 28).map((p) => (
              <g key={p}>
                <line x1={p} x2={p} y1="-180" y2="180" />
                <line x1="-220" x2="220" y1={p} y2={p} />
              </g>
            ))}
          </g>
          <g
            className="transformed-grid"
            style={{ transform: `matrix(${a}, ${-c}, ${-b}, ${d}, 0, 0)` }}
          >
            {Array.from({ length: 13 }, (_, i) => (i - 6) * 28).map((p) => (
              <g key={p} className={p === 0 ? 'grid-axis' : ''}>
                <line x1={p} x2={p} y1="-240" y2="240" />
                <line x1="-240" x2="240" y1={p} y2={p} />
              </g>
            ))}
            <path d="M0 0H28m-5-4 5 4-5 4M0 0v-28m-4 5 4-5 4 5" className="basis-vector" />
          </g>
        </g>
        <circle r="2.5" fill="#ddd" />
        <text x="180" y="15">
          x
        </text>
        <text x="8" y="-150">
          y
        </text>
        <text x="7" y="16">
          0
        </text>
      </svg>
      <span className="grid-hint">行列をここへドラッグ</span>
    </div>
  );
}
