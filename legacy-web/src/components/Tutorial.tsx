import { useGameStore } from '../store/useGameStore';
import { MathText } from './MathText';

export function Tutorial() {
  const step = useGameStore((s) => s.tutorialStep);
  const descriptions = [
    '2 を、ここへドラッグ。',
    '+ を、2 に重ねよう。',
    '3 を、式に重ねよう。',
    '2 と + と 3 を、ひとつにつなぐ。',
  ];
  return (
    <div className="tutorial" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-4">
        <span className="eyebrow">A SMALL BEGINNING</span>
        <span className="tutorial-counter">0{Math.min(step + 1, 4)} / 04</span>
      </div>
      <p>{descriptions[Math.min(step, 3)]}</p>
      <div className="tutorial-progress">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i <= step ? 'filled' : ''} />
        ))}
        <button onClick={() => useGameStore.getState().finishTutorial()}>
          Skip <span>↗</span>
        </button>
      </div>
    </div>
  );
}
export function EmptyWorkspace({ physics, tutorial }: { physics: boolean; tutorial: boolean }) {
  return (
    <div className="empty-workspace" aria-hidden="true">
      <div className="empty-notation">
        <MathText
          latex={physics ? '\\vec{F}=m\\vec{a}' : tutorial ? '2\\; +\\; 3' : 'x\\,\\cdot\\,x'}
        />
      </div>
      <span>
        {physics
          ? '物体を置いて、力を加えてみよう。'
          : tutorial
            ? '小さな記号から、はじめよう。'
            : '次は、何が生まれるだろう。'}
      </span>
      <div className="empty-crosshair">+</div>
    </div>
  );
}
