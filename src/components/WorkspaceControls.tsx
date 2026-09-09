import { useGameStore } from '../store/useGameStore';
import type { Bounds } from '../utils/layout';
import { Icon, type IconName } from './Icon';

export const toolbarButton = (
  icon: IconName,
  label: string,
  onClick: () => void,
  disabled = false,
  active = false,
) => (
  <button
    className={`icon-button ${active ? 'active' : ''}`}
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
  >
    <Icon name={icon} />
  </button>
);

export function AppHeader({ bounds }: { bounds: Bounds }) {
  const state = useGameStore();
  return (
    <header className="app-header flex items-center justify-between">
      <a
        className="brand flex items-center"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          state.setMode('sandbox', bounds);
        }}
      >
        <span className="brand-symbol">∑</span>
        <span>
          Math Elements<span className="brand-caption">A PLAYGROUND FOR THE CURIOUS</span>
        </span>
      </a>
      <nav className="mode-navigation flex" aria-label="モード">
        <button
          className={state.mode === 'sandbox' ? 'active' : ''}
          onClick={() => state.setMode('sandbox', bounds)}
        >
          Sandbox
        </button>
        <button
          className={state.mode === 'challenges' ? 'active' : ''}
          onClick={() => state.setMode('challenges', bounds)}
        >
          Challenges
          <span className="progress-count">
            {String(state.progress.length).padStart(2, '0')}
            <span>/10</span>
          </span>
        </button>
      </nav>
    </header>
  );
}

export function WorkspaceToolbar({
  cancel,
  experiments,
  onExperiments,
  onHelp,
}: {
  cancel: () => void;
  experiments: boolean;
  onExperiments: () => void;
  onHelp: () => void;
}) {
  const state = useGameStore();
  return (
    <div className="workspace-topline">
      <div className="domain-tabs">
        {(['math', 'physics'] as const).map((domain) => (
          <button
            key={domain}
            className={state.domain === domain ? 'active' : ''}
            disabled={state.mode === 'challenges'}
            onClick={() => state.setDomain(domain)}
          >
            {domain === 'math' ? 'Math' : 'Physics'}
          </button>
        ))}
        <span className="workspace-rule" />
        <span className="eyebrow">
          {state.mode === 'sandbox' ? 'FREE EXPLORATION' : 'GUIDED DISCOVERY'}
        </span>
      </div>
      <div className="workspace-tools">
        {toolbarButton(
          'undo',
          '元に戻す · Ctrl+Z',
          () => {
            cancel();
            state.undo();
          },
          !state.past.length,
        )}
        {toolbarButton(
          'redo',
          'やり直す · Ctrl+Shift+Z',
          () => {
            cancel();
            state.redo();
          },
          !state.future.length,
        )}
        <span className="tool-divider" />
        {state.domain === 'math' &&
          toolbarButton('grid', '座標グリッド', state.toggleGrid, false, Boolean(state.scene.grid))}
        {toolbarButton(
          'trash',
          'すべて消去',
          state.clear,
          !state.scene.objects.length && !state.scene.grid,
        )}
        <span className="tool-divider" />
        {toolbarButton('flask', '実験を開く', onExperiments, false, experiments)}
        {toolbarButton('help', '遊び方', onHelp)}
      </div>
    </div>
  );
}
