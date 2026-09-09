import type { BodyConfig, MotionState } from '../physics/model';
import { useGameStore } from '../store/useGameStore';
import { NumberField } from './NumberField';
import { MathText } from './MathText';

const format = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 3 }) : '—';

export function BodyInspector({
  id,
  body,
  motion,
}: {
  id: string;
  body: BodyConfig;
  motion?: MotionState;
}) {
  const actions = useGameStore();
  return (
    <div className="body-controls">
      <div className="inspector-equation">
        <MathText latex={'\\vec{F}=m\\vec{a}'} />
      </div>
      <NumberField
        label="質量"
        value={body.mass}
        unit="kg"
        min={0.01}
        max={1000}
        step={0.1}
        onChange={(mass) => actions.updateBody(id, { mass })}
      />
      <NumberField
        label="初速"
        value={body.speed}
        unit="m/s"
        min={0}
        max={100}
        step={1}
        onChange={(speed) => actions.updateBody(id, { speed })}
      />
      <NumberField
        label="角度"
        value={body.angle}
        unit="°"
        min={-180}
        max={180}
        onChange={(angle) => actions.updateBody(id, { angle })}
      />
      <NumberField
        label="重力"
        value={body.gravity}
        unit="m/s²"
        min={0}
        max={100}
        step={0.01}
        onChange={(gravity) => actions.updateBody(id, { gravity })}
      />
      <NumberField
        label="力 Fx"
        value={body.forceX}
        unit="N"
        min={-1000}
        max={1000}
        onChange={(forceX) => actions.updateBody(id, { forceX })}
      />
      <NumberField
        label="力 Fy"
        value={body.forceY}
        unit="N"
        min={-1000}
        max={1000}
        onChange={(forceY) => actions.updateBody(id, { forceY })}
      />
      {motion && (
        <div className="live-values" data-testid="live-values">
          <span>
            x(t) <b>{format(motion.x)} m</b>
          </span>
          <span>
            y(t) <b>{format(motion.y)} m</b>
          </span>
          <span>
            vₓ <b>{format(motion.vx)} m/s</b>
          </span>
          <span>
            vᵧ <b>{format(motion.vy)} m/s</b>
          </span>
          <span>
            speed <b>{format(motion.speed)} m/s</b>
          </span>
          <span>
            aₓ / aᵧ{' '}
            <b>
              {format(motion.ax)} / {format(motion.ay)}
            </b>
          </span>
        </div>
      )}
    </div>
  );
}
