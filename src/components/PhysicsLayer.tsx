import type { WorldObject } from '../store/types';
import type { MotionState } from '../physics/model';
import { motionAt } from '../physics/model';
import { PHYSICS_SCALE } from '../utils/layout';

export function PhysicsLayer({
  objects,
  motions,
  trails,
  challenge,
  height,
  selected,
}: {
  objects: WorldObject[];
  motions: Record<string, MotionState>;
  trails: boolean;
  challenge: boolean;
  height: number;
  selected: string | null;
}) {
  return (
    <svg className="physics-layer" aria-label="物体の軌跡">
      <line className="ground-line" x1="35" x2="100%" y1={height - 47} y2={height - 47} />
      <text x="38" y={height - 27}>
        0 m
      </text>
      {objects.map((o) => {
        if (!o.body) return null;
        const groundY = (o.y - (height - 65)) / PHYSICS_SCALE;
        const m = motions[o.id] ?? motionAt(o.body, 0, groundY);
        const count = Math.min(180, Math.max(2, Math.ceil(m.time * 40)));
        const points = Array.from({ length: count }, (_, i) => {
          const p = motionAt(o.body!, (m.time * i) / (count - 1), groundY);
          return `${o.x + p.x * PHYSICS_SCALE},${o.y - p.y * PHYSICS_SCALE}`;
        }).join(' ');
        return (
          <g key={o.id}>
            {trails && m.time > 0 && <polyline className="trajectory" points={points} />}
            {selected === o.id && (o.body.forceX !== 0 || o.body.forceY !== 0) && (
              <g className="force-indicator">
                <line
                  x1={o.x + m.x * PHYSICS_SCALE}
                  y1={o.y - m.y * PHYSICS_SCALE}
                  x2={o.x + m.x * PHYSICS_SCALE + o.body.forceX * 7}
                  y2={o.y - m.y * PHYSICS_SCALE - o.body.forceY * 7}
                />
                <circle
                  cx={o.x + m.x * PHYSICS_SCALE + o.body.forceX * 7}
                  cy={o.y - m.y * PHYSICS_SCALE - o.body.forceY * 7}
                  r="3"
                />
              </g>
            )}
          </g>
        );
      })}
      {challenge && (
        <g
          className="projectile-target"
          data-testid="projectile-target"
          transform={`translate(${(objects.find((o) => o.body)?.x ?? 100) + (400 / 9.81) * PHYSICS_SCALE}, ${(objects.find((o) => o.body)?.y ?? height - 65) + 16})`}
        >
          <path d="M-18-14v14h36v-14M0 0v12" />
          <text x="0" y="32" textAnchor="middle">
            40.77 m
          </text>
          <text x="0" y="-27" textAnchor="middle">
            TARGET
          </text>
        </g>
      )}
    </svg>
  );
}
