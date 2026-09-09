import { create } from 'zustand';
import { matrix, quantity, same, type Expression } from '../ast/types';
import {
  engine,
  combinePart,
  operateEquation,
  type EquationOperation,
  type ReactionResult,
} from '../engine/ReactionEngine';
import { applyQuantity, defaultBody, type BodyConfig } from '../physics/model';
import { challenges } from '../challenges';
import {
  emptyScene,
  type Domain,
  type Mode,
  type Scene,
  type Settings,
  type WorldObject,
} from './types';
import { loadSaved, STORAGE_KEY, type SavedState } from './persistence';
import { freePosition, uid, type Bounds } from '../utils/layout';
import { playSound } from '../utils/sound';
import { getPart, replacePart, type ExpressionPath } from '../ast/parts';

interface Transition {
  node: Expression;
  explanation: string;
  token: string;
}
interface GameStore {
  mode: Mode;
  domain: Domain;
  scene: Scene;
  sandboxes: SavedState['sandboxes'];
  past: Scene[];
  future: Scene[];
  selected: string | null;
  selectedPart: ExpressionPath | null;
  selectPart: (id: string, path: ExpressionPath) => void;
  settle: (id: string) => void;
  extractPart: (
    id: string,
    path: ExpressionPath,
    bounds?: Bounds,
    point?: { x: number; y: number },
    apart?: boolean,
  ) => void;
  simplifyPart: (id: string, path: ExpressionPath) => void;
  settings: Settings;
  tutorialComplete: boolean;
  tutorialStep: number;
  progress: number[];
  activeChallenge: number;
  challengeComplete: boolean;
  transitions: Record<string, Transition>;
  notice: string;
  storageError: boolean;
  running: boolean;
  simulationEpoch: number;
  commit: (scene: Scene, selected?: string | null) => void;
  select: (id: string | null) => void;
  addObject: (node: Expression, x: number, y: number, bounds?: Bounds, trayKey?: string) => void;
  moveObject: (id: string, x: number, y: number, bounds: Bounds, node?: Expression) => void;
  react: (
    targetId: string,
    incoming: Expression,
    sourceId?: string,
    bounds?: Bounds,
    path?: ExpressionPath,
    sourcePath?: ExpressionPath,
  ) => boolean;
  transform: (id: string, result: ReactionResult) => void;
  simplifyObject: (id: string) => void;
  breakApart: (id: string, bounds?: Bounds) => void;
  equationOperation: (id: string, operation: EquationOperation, operand: Expression) => void;
  updateNode: (id: string, node: Expression) => void;
  updateBody: (id: string, patch: Partial<BodyConfig>) => void;
  remove: (id?: string) => void;
  duplicate: (id: string, bounds?: Bounds) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  setDomain: (domain: Domain) => void;
  setMode: (mode: Mode, bounds?: Bounds) => void;
  startChallenge: (id: number, bounds?: Bounds) => void;
  finishChallenge: () => void;
  setSettings: (settings: Partial<Settings>) => void;
  finishTutorial: () => void;
  observeTray: (key: string) => void;
  setNotice: (notice: string) => void;
  toggleGrid: () => void;
  applyMatrix: (node: Expression, sourceId?: string) => void;
  toggleRunning: () => void;
  resetSimulation: () => void;
}
const saved = loadSaved();
export const useGameStore = create<GameStore>()((set, get) => ({
  mode: 'sandbox',
  domain: 'math',
  scene: saved.sandboxes.math,
  sandboxes: saved.sandboxes,
  past: [],
  future: [],
  selected: null,
  selectedPart: null,
  settings: saved.settings,
  tutorialComplete: saved.tutorialComplete,
  tutorialStep: 0,
  progress: saved.progress,
  activeChallenge: 1,
  challengeComplete: false,
  transitions: {},
  notice: '',
  storageError: false,
  running: false,
  simulationEpoch: 0,
  commit: (scene, selected) => {
    const s = get();
    set({
      scene,
      selected: selected === undefined ? s.selected : selected,
      selectedPart: null,
      past: [...s.past.slice(-79), s.scene],
      future: [],
      ...(s.mode === 'sandbox' ? { sandboxes: { ...s.sandboxes, [s.domain]: scene } } : {}),
    });
    if (s.mode === 'challenges' && challenges[s.activeChallenge - 1].test(scene.objects))
      get().finishChallenge();
    if (
      !s.tutorialComplete &&
      scene.objects.some(
        (o) =>
          o.node.kind === 'add' &&
          o.node.terms.length === 2 &&
          o.node.terms.some((t) => t.kind === 'number' && t.value === 2) &&
          o.node.terms.some((t) => t.kind === 'number' && t.value === 3),
      )
    )
      get().finishTutorial();
  },
  select: (selected) => set({ selected, selectedPart: null }),
  selectPart: (selected, selectedPart) => set({ selected, selectedPart }),
  settle: (id) => {
    const transitions = { ...get().transitions };
    delete transitions[id];
    set({ transitions });
  },
  extractPart: (id, path, bounds, point, apart = false) => {
    const s = get(),
      object = s.scene.objects.find((o) => o.id === id);
    const part = object && getPart(object.node, path);
    if (!object || !part || !path.length || part.kind === 'hole') return;
    const remainder = replacePart(object.node, path, { kind: 'hole' });
    const objects = s.scene.objects.map((o) => (o.id === id ? { ...o, node: remainder } : o));
    const pieces = apart ? engine.expand(part) : [part];
    const created: WorldObject[] = [];
    for (const [i, node] of pieces.entries()) {
      const position = freePosition(
        node,
        { x: (point?.x ?? object.x + 170) + i * 90, y: point?.y ?? object.y + 90 },
        [...objects, ...created],
        bounds,
      );
      created.push({ id: uid(), node: structuredClone(node), ...position });
    }
    s.settle(id);
    s.commit({ ...s.scene, objects: [...objects, ...created] }, created[0].id);
    s.setNotice('中身を取り出しました · □ に戻すこともできます');
  },
  simplifyPart: (id, path) => {
    const s = get(),
      object = s.scene.objects.find((o) => o.id === id),
      part = object && getPart(object.node, path);
    if (!object || !part) return;
    try {
      const result = engine.simplifySteps(part);
      s.settle(id);
      s.transform(id, {
        ...result,
        result: replacePart(object.node, path, result.result),
        intermediate: result.intermediate
          ? replacePart(object.node, path, result.intermediate)
          : undefined,
      });
    } catch (error) {
      s.setNotice(error instanceof Error ? error.message : 'この部分は簡約できません');
    }
  },
  addObject: (node, x, y, bounds, trayKey) => {
    const s = get();
    const id = uid();
    const body =
      node.kind === 'quantity' && node.quantity === 'mass'
        ? { ...defaultBody(), mass: Math.max(0.01, node.value) }
        : undefined;
    const position =
      node.kind === 'vector'
        ? { x: Math.max(40, x), y: Math.max(50, y) }
        : freePosition(
            node,
            { x, y: body && bounds ? Math.min(y, bounds.height - 65) : y },
            s.scene.objects,
            bounds,
          );
    s.commit(
      {
        ...s.scene,
        objects: [
          ...s.scene.objects,
          { id, node: structuredClone(node), ...position, ...(body ? { body } : {}) },
        ],
      },
      id,
    );
    if (trayKey) get().observeTray(trayKey);
  },
  moveObject: (id, x, y, bounds, node) => {
    const s = get(),
      object = s.scene.objects.find((o) => o.id === id);
    if (!object) return;
    const updatedNode = node ?? object.node;
    if (object.body) s.resetSimulation();
    const position =
      updatedNode.kind === 'vector' || object.body
        ? { x, y: object.body ? Math.min(y, bounds.height - 65) : y }
        : freePosition(
            updatedNode,
            { x, y },
            s.scene.objects.filter((o) => o.id !== id),
            bounds,
          );
    if (
      Math.hypot(position.x - object.x, position.y - object.y) < 0.5 &&
      same(updatedNode, object.node)
    )
      return;
    s.commit(
      {
        ...s.scene,
        objects: s.scene.objects.map((o) =>
          o.id === id
            ? {
                ...o,
                ...position,
                node: updatedNode,
                vectorParts: node ? undefined : o.vectorParts,
              }
            : o,
        ),
      },
      id,
    );
  },
  react: (targetId, incoming, sourceId, bounds, path = [], sourcePath) => {
    const s = get(),
      target = s.scene.objects.find((o) => o.id === targetId);
    if (!target || sourceId === targetId) return false;
    const reaction = path.length
      ? combinePart(target.node, path, incoming)
      : engine.combine(target.node, incoming, { targetIsBody: Boolean(target.body) });
    if (!reaction) return false;
    const body =
      reaction.quantity && target.body
        ? applyQuantity(target.body, reaction.quantity)
        : target.body;
    if (body) s.resetSimulation();
    const node = body ? quantity('mass', body.mass) : reaction.result;
    const vectorParts =
      target.node.kind === 'vector' && incoming.kind === 'vector'
        ? ([target.node, incoming] as [typeof target.node, typeof incoming])
        : undefined;
    const others = s.scene.objects.filter(
      (o) => (sourcePath || o.id !== sourceId) && o.id !== targetId,
    );
    const position =
      node.kind === 'vector' || body
        ? { x: target.x, y: target.y }
        : freePosition(node, target, others, bounds);
    s.commit(
      {
        ...s.scene,
        objects: s.scene.objects
          .filter((o) => sourcePath || o.id !== sourceId)
          .map((o) =>
            o.id === targetId
              ? { ...o, ...position, node, body, vectorParts }
              : o.id === sourceId && sourcePath
                ? { ...o, node: replacePart(o.node, sourcePath, { kind: 'hole' }) }
                : o,
          ),
      },
      targetId,
    );
    get().settle(targetId);
    get().transform(targetId, { ...reaction, result: node });
    playSound('combine', get().settings.muted);
    return true;
  },
  transform: (id, result) => {
    const s = get();
    if (!s.scene.objects.some((o) => o.id === id)) return;
    if (!same(s.scene.objects.find((o) => o.id === id)!.node, result.result))
      s.commit(
        {
          ...s.scene,
          objects: s.scene.objects.map((o) => (o.id === id ? { ...o, node: result.result } : o)),
        },
        id,
      );
    if (result.intermediate && !same(result.intermediate, result.result)) {
      const token = uid();
      set({
        transitions: {
          ...get().transitions,
          [id]: { node: result.intermediate, explanation: result.explanation ?? '', token },
        },
      });
      setTimeout(() => {
        const current = get().transitions;
        if (current[id]?.token !== token) return;
        const next = { ...current };
        delete next[id];
        set({ transitions: next });
      }, 1050);
    }
    if (result.explanation) get().setNotice(result.explanation);
  },
  simplifyObject: (id) => {
    const o = get().scene.objects.find((o) => o.id === id);
    if (!o || get().transitions[id]) return;
    try {
      const result = engine.simplifySteps(o.node);
      if (same(o.node, result.result)) {
        get().setNotice(
          o.node.kind === 'integral' || o.node.kind === 'derivative'
            ? 'この式は記号のまま保持します'
            : 'これ以上簡約できません · 分解して組み直せます',
        );
        return;
      }
      get().transform(id, result);
      playSound('combine', get().settings.muted);
    } catch (error) {
      get().setNotice(error instanceof Error ? error.message : 'この式は評価できません');
    }
  },
  breakApart: (id, bounds) => {
    const s = get(),
      o = s.scene.objects.find((o) => o.id === id);
    if (!o) return;
    const parts = engine.expand(o.node);
    if (parts.length <= 1) {
      s.setNotice('これ以上分解できません');
      return;
    }
    const others = s.scene.objects.filter((o) => o.id !== id);
    const created: WorldObject[] = [];
    parts.forEach((node, i) => {
      const p = freePosition(
        node,
        { x: o.x + (i - (parts.length - 1) / 2) * 100, y: o.y },
        [...others, ...created],
        bounds,
      );
      created.push({ id: uid(), node: structuredClone(node), ...p });
    });
    s.commit({ ...s.scene, objects: [...others, ...created] }, null);
    s.setNotice('式を構成する要素に分解しました');
  },
  equationOperation: (id, operation, operand) => {
    const o = get().scene.objects.find((o) => o.id === id);
    if (o?.node.kind !== 'equation') return;
    try {
      const result = operateEquation(o.node, operation, operand);
      if (result) get().transform(id, result);
      else get().setNotice('両辺のつり合いを保てる操作を選んでください');
    } catch (error) {
      get().setNotice(error instanceof Error ? error.message : '操作できません');
    }
  },
  updateNode: (id, node) => {
    const s = get();
    s.commit({
      ...s.scene,
      objects: s.scene.objects.map((o) => (o.id === id ? { ...o, node } : o)),
    });
  },
  updateBody: (id, patch) => {
    const s = get();
    s.resetSimulation();
    s.commit({
      ...s.scene,
      objects: s.scene.objects.map((o) =>
        o.id === id && o.body
          ? {
              ...o,
              body: { ...o.body, ...patch },
              node: quantity('mass', patch.mass ?? o.body.mass),
            }
          : o,
      ),
    });
  },
  remove: (id) => {
    const s = get(),
      target = id ?? s.selected;
    if (target)
      s.commit({ ...s.scene, objects: s.scene.objects.filter((o) => o.id !== target) }, null);
  },
  duplicate: (id, bounds) => {
    const s = get(),
      o = s.scene.objects.find((o) => o.id === id);
    if (!o) return;
    const copy = {
      ...structuredClone(o),
      id: uid(),
      ...freePosition(o.node, { x: o.x + 100, y: o.y + 70 }, s.scene.objects, bounds),
    };
    s.commit({ ...s.scene, objects: [...s.scene.objects, copy] }, copy.id);
  },
  undo: () => {
    const s = get(),
      scene = s.past.at(-1);
    if (!scene) return;
    set({
      scene,
      past: s.past.slice(0, -1),
      future: [s.scene, ...s.future],
      selected: null,
      transitions: {},
      running: false,
      simulationEpoch: s.simulationEpoch + 1,
      challengeComplete:
        s.mode === 'challenges' && challenges[s.activeChallenge - 1].test(scene.objects),
      ...(s.mode === 'sandbox' ? { sandboxes: { ...s.sandboxes, [s.domain]: scene } } : {}),
    });
  },
  redo: () => {
    const s = get(),
      scene = s.future[0];
    if (!scene) return;
    set({
      scene,
      past: [...s.past, s.scene],
      future: s.future.slice(1),
      selected: null,
      transitions: {},
      running: false,
      simulationEpoch: s.simulationEpoch + 1,
      challengeComplete:
        s.mode === 'challenges' && challenges[s.activeChallenge - 1].test(scene.objects),
      ...(s.mode === 'sandbox' ? { sandboxes: { ...s.sandboxes, [s.domain]: scene } } : {}),
    });
  },
  clear: () => {
    const s = get();
    s.resetSimulation();
    set({ transitions: {} });
    s.commit(emptyScene(), null);
  },
  setDomain: (domain) => {
    const s = get();
    if (s.mode !== 'sandbox' || domain === s.domain) return;
    set({
      domain,
      scene: s.sandboxes[domain],
      past: [],
      future: [],
      selected: null,
      transitions: {},
      running: false,
      simulationEpoch: s.simulationEpoch + 1,
      notice: '',
    });
  },
  setMode: (mode, bounds) => {
    const s = get();
    if (s.mode === mode) return;
    if (mode === 'challenges') {
      s.startChallenge(s.activeChallenge, bounds);
      return;
    }
    set({
      mode,
      scene: s.sandboxes[s.domain],
      past: [],
      future: [],
      selected: null,
      transitions: {},
      challengeComplete: false,
      running: false,
      simulationEpoch: s.simulationEpoch + 1,
      notice: '',
    });
  },
  startChallenge: (id, bounds = { width: 1200, height: 550 }) => {
    const challenge = challenges[id - 1];
    if (!challenge) return;
    const objects: WorldObject[] = challenge.seeds.map((node, i) => ({
      id: uid(),
      node: structuredClone(node),
      x:
        challenge.domain === 'physics'
          ? 100
          : bounds.width / 2 + (i - (challenge.seeds.length - 1) / 2) * 210,
      y: challenge.domain === 'physics' ? bounds.height - 65 : bounds.height * 0.52,
      ...(challenge.domain === 'physics' ? { body: { ...defaultBody(), gravity: 9.81 } } : {}),
    }));
    set({
      mode: 'challenges',
      domain: challenge.domain,
      activeChallenge: id,
      scene: { objects, grid: null },
      past: [],
      future: [],
      selected: null,
      transitions: {},
      challengeComplete: false,
      running: false,
      simulationEpoch: get().simulationEpoch + 1,
      notice: '',
    });
  },
  finishChallenge: () => {
    const s = get();
    if (s.challengeComplete) return;
    set({ challengeComplete: true, progress: [...new Set([...s.progress, s.activeChallenge])] });
    playSound('correct', s.settings.muted);
  },
  setSettings: (settings) => set({ settings: { ...get().settings, ...settings } }),
  finishTutorial: () => set({ tutorialComplete: true, tutorialStep: 4 }),
  observeTray: (key) => {
    const s = get();
    if (!s.tutorialComplete && key === ['2', '+', '3'][s.tutorialStep])
      set({ tutorialStep: s.tutorialStep + 1 });
  },
  setNotice: (notice) => {
    set({ notice });
    setTimeout(() => {
      if (get().notice === notice) set({ notice: '' });
    }, 3500);
  },
  toggleGrid: () => {
    const s = get();
    s.commit({ ...s.scene, grid: s.scene.grid ? null : matrix() });
  },
  applyMatrix: (node, sourceId) => {
    if (node.kind !== 'matrix') return;
    const s = get();
    s.commit(
      {
        ...s.scene,
        grid: node,
        objects: sourceId ? s.scene.objects.filter((o) => o.id !== sourceId) : s.scene.objects,
      },
      null,
    );
    s.setNotice('行列を座標グリッドに適用しました');
  },
  toggleRunning: () => set({ running: !get().running }),
  resetSimulation: () => set({ running: false, simulationEpoch: get().simulationEpoch + 1 }),
}));

if (typeof window !== 'undefined') {
  let lastSaved = '';
  useGameStore.subscribe((s) => {
    try {
      const value: SavedState = {
        version: 1,
        sandboxes: s.sandboxes,
        settings: s.settings,
        tutorialComplete: s.tutorialComplete,
        progress: s.progress,
      };
      const serialized = JSON.stringify(value);
      if (serialized === lastSaved) return;
      localStorage.setItem(STORAGE_KEY, serialized);
      lastSaved = serialized;
      if (s.storageError) useGameStore.setState({ storageError: false });
    } catch {
      if (!s.storageError) useGameStore.setState({ storageError: true });
    }
  });
}
