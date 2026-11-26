import type { BodyConfig, MotionState } from '../physics/model';
import { useGameStore } from '../store/useGameStore';
import { NumberField } from './NumberField';
import { MathText } from './MathText';
import { fluidForces } from '../physics/model';

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
  const forces = fluidForces(
    body,
    motion?.vx ?? body.speed * Math.cos((body.angle * Math.PI) / 180),
    motion?.vy ?? body.speed * Math.sin((body.angle * Math.PI) / 180),
  );
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
      <details
        className="physics-properties"
        open={
          Boolean(
            body.friction ||
            body.drag ||
            body.lift ||
            body.displacedVolume ||
            body.restitution ||
            body.windX ||
            body.windY,
          ) || undefined
        }
      >
        <summary>摩擦・流体・反発</summary>
        {(
          [
            ['friction', '摩擦係数', '', 0, 2, 0.05, 0],
            ['drag', '抵抗係数', '', 0, 5, 0.01, 0],
            ['lift', '揚力係数', '', -5, 5, 0.1, 0],
            ['density', '流体密度', 'kg/m³', 0, 2000, 0.1, 1.225],
            ['area', '基準面積', 'm²', 0, 100, 0.01, 0.1],
            ['displacedVolume', '水中の体積', 'm³', 0, 10, 0.001, 0],
            ['windX', '風速 X', 'm/s', -100, 100, 1, 0],
            ['windY', '風速 Y', 'm/s', -100, 100, 1, 0],
            ['restitution', '反発係数', '', 0, 1, 0.1, 0],
          ] as const
        ).map(([key, label, unit, min, max, step, fallback]) => (
          <NumberField
            key={key}
            label={label}
            unit={unit}
            value={body[key] ?? fallback}
            min={min}
            max={max}
            step={step}
            onChange={(value) => actions.updateBody(id, { [key]: value })}
          />
        ))}
        <p className="inspector-hint">
          摩擦は床で作用。抵抗・揚力は風との相対速度から計算します。正の揚力は相対速度の左側（右向き飛行なら上）へ働きます。
        </p>
        <p className="inspector-hint">
          空気密度は 1.225、水は 1000 kg/m³
          が目安。浮力は指定した水中体積を一定として計算し、水面の出入りは扱いません。重力も設定してください。
        </p>
        <div className="force-readouts">
          <MathText latex={'D=\\tfrac12\\rho C_D A v_r^2'} />
          <span>抵抗 {format(Math.hypot(forces.dragX, forces.dragY))} N</span>
          <MathText latex={'L=\\tfrac12\\rho C_L A v_r^2'} />
          <span>揚力 {format(Math.hypot(forces.liftX, forces.liftY))} N</span>
          <MathText latex={'F_B=\\rho g V'} />
          <span>浮力 {format(forces.buoyancy)} N</span>
        </div>
      </details>
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
