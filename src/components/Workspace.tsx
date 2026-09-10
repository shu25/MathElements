import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useDrag } from './useDrag';
import { useSimulation } from './useSimulation';
import { WorldElement } from './WorldElement';
import { Tray } from './Tray';
import { Grid } from './Grid';
import { Inspector } from './Inspector';
import { Tutorial, EmptyWorkspace } from './Tutorial';
import { ChallengePanel } from './ChallengePanel';
import { PhysicsLayer } from './PhysicsLayer';
import { PHYSICS_SCALE } from '../utils/layout';
import { Icon } from './Icon';
import { AppHeader, WorkspaceToolbar, toolbarButton } from './WorkspaceControls';
import { Experiments } from './Experiments';
import { Help } from './Help';
import { decodePath, encodePath } from '../ast/parts';
import { MathText } from './MathText';

export function Workspace() {
  const stage = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 1200, height: 550 });
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [exponent, setExponent] = useState<string | null>(null);
  const [help, setHelp] = useState(false),
    [experiments, setExperiments] = useState(false);
  const state = useGameStore();
  const { drag, drop, target, cancel, startTray, startObject, startPart, startEndpoint } =
    useDrag(stage);
  const { time, motions } = useSimulation(bounds.height);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const resize = () => {
      const r = element.getBoundingClientRect();
      setBounds({ width: r.width, height: r.height });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    cancel();
    setMenu(null);
    setExponent(null);
  }, [state.mode, state.domain, state.activeChallenge]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,[contenteditable="true"]')) return;
      const s = useGameStore.getState();
      const selectedObject = s.scene.objects.find((o) => o.id === s.selected);
      const rect = stage.current?.getBoundingClientRect();
      if (selectedObject && rect && !(e.target as HTMLElement)?.closest('button')) {
        const b = { width: rect.width, height: rect.height };
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          s.duplicate(selectedObject.id, b);
          return;
        }
        if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'r') {
          e.preventDefault();
          s.rotateObject(selectedObject.id, e.shiftKey ? -15 : 15);
          return;
        }
        const delta = (
          { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<
            string,
            number[]
          >
        )[e.key];
        if (delta) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          s.moveObject(
            selectedObject.id,
            Math.max(24, Math.min(b.width - 24, selectedObject.x + delta[0] * step)),
            Math.max(24, Math.min(b.height - 24, selectedObject.y + delta[1] * step)),
            b,
          );
          return;
        }
      }
      if (e.key === 'Escape') {
        s.setMoveOnly(false);
        s.select(null);
        setMenu(null);
        setHelp(false);
        setExperiments(false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        cancel();
        if (e.shiftKey) s.redo();
        else s.undo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selected) {
        e.preventDefault();
        s.remove();
      }
      if (
        e.key === 'Enter' &&
        s.selected &&
        (e.target as HTMLElement).closest('[data-object-id]')
      ) {
        e.preventDefault();
        s.simplifyObject(s.selected);
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const selected = state.scene.objects.find((o) => o.id === state.selected);
  return (
    <>
      <AppHeader bounds={bounds} />
      <div className={`workbench ${state.moveOnly ? 'move-only' : ''}`}>
        <Tray onDrag={startTray} />
        <main
          className="workspace"
          ref={stage}
          data-testid="workspace"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              state.select(null);
              setMenu(null);
              setExperiments(false);
            }
          }}
          onContextMenu={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <WorkspaceToolbar
            cancel={cancel}
            experiments={experiments}
            onExperiments={() => setExperiments(!experiments)}
            onHelp={() => setHelp(true)}
          />
          {state.moveOnly && (
            <button className="move-mode-banner" onClick={() => state.setMoveOnly(false)}>
              移動モード · 合成しない <span>終了 ×</span>
            </button>
          )}
          {state.mode === 'challenges' && <ChallengePanel bounds={bounds} />}
          {state.mode === 'sandbox' && state.domain === 'math' && !state.tutorialComplete && (
            <Tutorial />
          )}
          {!state.scene.objects.length && !state.scene.grid && state.mode === 'sandbox' && (
            <EmptyWorkspace
              physics={state.domain === 'physics'}
              tutorial={!state.tutorialComplete}
            />
          )}
          {state.scene.grid && <Grid matrix={state.scene.grid} highlighted={target === '__grid'} />}
          {state.domain === 'physics' && (
            <PhysicsLayer
              objects={state.scene.objects}
              motions={motions}
              trails={state.settings.trails}
              challenge={state.mode === 'challenges' && state.activeChallenge === 10}
              height={bounds.height}
              selected={state.selected}
            />
          )}
          <div className="workspace-crosshair corner-tl" />
          <div className="workspace-crosshair corner-br" />
          {state.scene.objects.map((object) => {
            const d = drag?.sourceId === object.id && !drag.sourcePath && drag.moved ? drag : null;
            const motion = object.body ? motions[object.id] : null;
            const positioned = d
              ? { ...object, x: d.x, y: d.y, node: d.node }
              : motion
                ? {
                    ...object,
                    x: object.x + motion.x * PHYSICS_SCALE,
                    y: object.y - motion.y * PHYSICS_SCALE,
                  }
                : object;
            return (
              <WorldElement
                key={object.id}
                object={positioned}
                selected={state.selected === object.id}
                magnetic={target === object.id}
                dragging={Boolean(d)}
                displayNode={state.transitions[object.id]?.node}
                busy={Boolean(state.transitions[object.id])}
                selectedPart={
                  state.selected === object.id ? encodePath(state.selectedPart ?? []) : undefined
                }
                targetPart={drop?.id === object.id ? encodePath(drop.path) : undefined}
                onPartPointerDown={(e, path) => {
                  setMenu(null);
                  setExponent(null);
                  startPart(e, object, path);
                }}
                onPointerDown={(e) => {
                  setMenu(null);
                  setExponent(null);
                  startObject(e, object.body ? positioned : object);
                }}
                onDoubleClick={() => state.simplifyObject(object.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  state.select(object.id);
                  const partPath = decodePath(
                    (e.target as Element)
                      .closest('[data-node-path]')
                      ?.getAttribute('data-node-path') ?? null,
                  );
                  if (partPath.length) state.selectPart(object.id, partPath);
                  const r = stage.current!.getBoundingClientRect();
                  setMenu({
                    id: object.id,
                    x: Math.max(12, Math.min(bounds.width - 210, e.clientX - r.left)),
                    y: Math.max(55, Math.min(bounds.height - 210, e.clientY - r.top)),
                  });
                }}
                onEndpoint={(e, endpoint) => startEndpoint(e, object, endpoint)}
                onExponent={() => {
                  state.select(object.id);
                  setExponent(object.id);
                }}
              />
            );
          })}
          {state.domain === 'physics' &&
            state.scene.objects
              .filter(
                (o) => o.node.kind === 'quantity' && ['time', 'distance'].includes(o.node.quantity),
              )
              .map((o) => (
                <div
                  key={o.id}
                  className="physics-measurement"
                  style={{ left: o.x, top: o.y + 32 }}
                >
                  {o.node.kind === 'quantity' && o.node.quantity === 'time' ? (
                    `${time.toFixed(2)} s`
                  ) : (
                    <>
                      <span
                        className="distance-ruler"
                        style={{
                          width:
                            o.node.kind === 'quantity'
                              ? Math.max(20, o.node.value * PHYSICS_SCALE)
                              : 100,
                        }}
                      />
                      {o.node.kind === 'quantity' ? o.node.value : 10} m
                    </>
                  )}
                </div>
              ))}
          {drag && (!drag.sourceId || drag.sourcePath) && drag.moved && (
            <WorldElement
              object={{ id: 'drag-preview', node: drag.node, x: drag.x, y: drag.y }}
              selected={false}
              dragging
              onPointerDown={() => {}}
              onDoubleClick={() => {}}
              onContextMenu={() => {}}
            />
          )}
          {selected && !drag?.moved && (
            <Inspector
              key={selected.id}
              object={selected}
              motion={motions[selected.id]}
              exponent={exponent === selected.id}
              onCloseExponent={() => setExponent(null)}
              bounds={bounds}
            />
          )}
          {drag?.moved && drop && (
            <div className="drop-preview" role="status">
              <span>{drop.label}</span>
              {drop.reaction && <MathText node={drop.reaction.result} />}
              <small>離すと確定</small>
            </div>
          )}
          {state.domain === 'physics' && (
            <div className="simulation-controls">
              <button
                aria-label={state.running ? '一時停止' : '再生'}
                className="simulation-play"
                disabled={!state.scene.objects.some((o) => o.body)}
                onClick={state.toggleRunning}
              >
                <Icon name={state.running ? 'pause' : 'play'} size={17} />
                {state.running ? 'Pause' : 'Run'}
              </button>
              {toolbarButton('reset', 'シミュレーションをリセット', state.resetSimulation)}
              <span className="simulation-time">
                {time.toFixed(2)} <small>s</small>
              </span>
              <button
                className={`trail-toggle ${state.settings.trails ? 'active' : ''}`}
                onClick={() => state.setSettings({ trails: !state.settings.trails })}
              >
                <span />
                軌跡
              </button>
            </div>
          )}
          <div className="workspace-status">
            <span className="status-dot" />
            <span>{String(state.scene.objects.length).padStart(2, '0')} ELEMENTS</span>
            <span className="status-divider">/</span>
            <span>{state.storageError ? '保存できません' : 'LOCAL · AUTOSAVED'}</span>
          </div>
          <div className="sound-control">
            {toolbarButton(
              state.settings.muted ? 'muted' : 'sound',
              state.settings.muted ? 'サウンドをオン' : 'ミュート',
              () => state.setSettings({ muted: !state.settings.muted }),
            )}
          </div>
          {state.notice && (
            <div className="reaction-notice" role="status">
              {state.notice}
            </div>
          )}
          {menu && (
            <div
              className="context-menu"
              role="menu"
              style={{ left: menu.x, top: menu.y }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {state.selected === menu.id && state.selectedPart?.length ? (
                <>
                  <button
                    role="menuitem"
                    onClick={() => {
                      state.extractPart(menu.id, state.selectedPart!, bounds);
                      setMenu(null);
                    }}
                  >
                    <Icon name="arrow" size={15} />
                    中身を取り出す
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      state.extractPart(menu.id, state.selectedPart!, bounds, undefined, true);
                      setMenu(null);
                    }}
                  >
                    <Icon name="split" size={15} />
                    中身を分解する
                  </button>
                </>
              ) : null}
              {(
                [
                  {
                    label: '簡約 / Evaluate',
                    icon: 'check',
                    action: () => state.simplifyObject(menu.id),
                  },
                  {
                    label: '分解 / Break apart',
                    icon: 'split',
                    action: () => state.breakApart(menu.id, bounds),
                  },
                  {
                    label: '複製 / Duplicate',
                    icon: 'copy',
                    action: () => state.duplicate(menu.id, bounds),
                  },
                  { label: '削除 / Delete', icon: 'trash', action: () => state.remove(menu.id) },
                ] as const
              ).map((item) => (
                <button
                  key={item.label}
                  role="menuitem"
                  onClick={() => {
                    item.action();
                    setMenu(null);
                  }}
                >
                  <Icon name={item.icon} size={15} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
          {experiments && <Experiments bounds={bounds} onClose={() => setExperiments(false)} />}
        </main>
      </div>
      {help && <Help onClose={() => setHelp(false)} />}
    </>
  );
}
