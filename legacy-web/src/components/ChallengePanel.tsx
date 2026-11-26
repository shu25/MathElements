import { useState } from 'react';
import { challenges } from '../challenges';
import { useGameStore } from '../store/useGameStore';
import type { Bounds } from '../utils/layout';
import { Icon } from './Icon';

export function ChallengePanel({ bounds }: { bounds: Bounds }) {
  const active = useGameStore((s) => s.activeChallenge),
    progress = useGameStore((s) => s.progress),
    complete = useGameStore((s) => s.challengeComplete);
  const challenge = challenges[active - 1];
  const [hint, setHint] = useState(false);
  return (
    <section className="challenge-panel" onPointerDown={(e) => e.stopPropagation()}>
      <div className="challenge-navigation">
        {challenges.map((c) => (
          <button
            key={c.id}
            title={c.title}
            aria-label={`Challenge ${c.id}`}
            className={`${active === c.id ? 'current' : ''} ${progress.includes(c.id) ? 'completed' : ''}`}
            onClick={() => {
              setHint(false);
              useGameStore.getState().startChallenge(c.id, bounds);
            }}
          >
            {progress.includes(c.id) && active !== c.id ? (
              <Icon name="check" size={12} />
            ) : (
              String(c.id).padStart(2, '0')
            )}
          </button>
        ))}
        <span>{progress.length} / 10</span>
      </div>
      <div className="eyebrow">CHALLENGE {String(active).padStart(2, '0')}</div>
      <h1>{challenge.title}</h1>
      <p>{challenge.subtitle}</p>
      {complete ? (
        <div className="challenge-success" role="status">
          <span>
            <Icon name="check" size={16} /> 発見しました
          </span>
          <button
            onClick={() => {
              if (active < 10) {
                setHint(false);
                useGameStore.getState().startChallenge(active + 1, bounds);
              } else useGameStore.getState().setMode('sandbox');
            }}
          >
            {active < 10 ? '次のチャレンジ' : 'Sandbox へ'}
            <Icon name="arrow" size={16} />
          </button>
        </div>
      ) : (
        <div className="challenge-hint">
          <button onClick={() => setHint(!hint)}>
            {hint ? 'ヒントを閉じる' : '小さなヒント'}
            <span>{hint ? '−' : '+'}</span>
          </button>
          {hint && <p>{challenge.hint}</p>}
        </div>
      )}
    </section>
  );
}
