import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { motionAt } from '../physics/model';

export function useSimulation(height: number) {
  const running = useGameStore((s) => s.running),
    epoch = useGameStore((s) => s.simulationEpoch),
    objects = useGameStore((s) => s.scene.objects);
  const [time, setTime] = useState(0),
    timeRef = useRef(0);
  useEffect(() => {
    timeRef.current = 0;
    setTime(0);
  }, [epoch]);
  useEffect(() => {
    if (!running) return;
    let frame = 0,
      previous = performance.now(),
      lastPaint = 0;
    const tick = (now: number) => {
      // Cap large frame gaps: changing browser tabs must not teleport a projectile.
      timeRef.current += Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (now - lastPaint >= 25) {
        setTime(timeRef.current);
        lastPaint = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, epoch]);
  const motions = useMemo(
    () =>
      Object.fromEntries(
        objects
          .filter((o) => o.body)
          .map((o) => [o.id, motionAt(o.body!, time, (o.y - (height - 65)) / 10)]),
      ),
    [objects, time, height],
  );
  useEffect(() => {
    const s = useGameStore.getState();
    if (
      s.mode === 'challenges' &&
      s.activeChallenge === 10 &&
      !s.challengeComplete &&
      s.scene.objects.some(
        (o) =>
          o.body &&
          o.body.speed === 20 &&
          o.body.angle === 45 &&
          o.body.gravity === 9.81 &&
          motions[o.id]?.landed &&
          Math.abs(motions[o.id].x - 400 / 9.81) <= 1.5,
      )
    )
      s.finishChallenge();
    const values = Object.values(motions);
    if (s.running && values.length && values.every((m) => m.landed))
      useGameStore.setState({ running: false });
  }, [motions]);
  return { time, motions };
}
