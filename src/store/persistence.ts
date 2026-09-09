import { isExpression } from '../ast/types';
import { isBody } from '../physics/model';
import { emptyScene, type Scene, type Settings } from './types';

export const STORAGE_KEY = 'math-elements:v1';
export interface SavedState {
  version: 1;
  sandboxes: { math: Scene; physics: Scene };
  settings: Settings;
  tutorialComplete: boolean;
  progress: number[];
}
export const defaults = (): SavedState => ({
  version: 1,
  sandboxes: { math: emptyScene(), physics: emptyScene() },
  settings: { muted: true, trails: true },
  tutorialComplete: false,
  progress: [],
});
export function isScene(value: unknown): value is Scene {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.grid !== null && (!isExpression(v.grid) || v.grid.kind !== 'matrix')) return false;
  if (!Array.isArray(v.objects) || v.objects.length > 2000) return false;
  const ids = new Set<string>();
  return v.objects.every((o: unknown) => {
    if (!o || typeof o !== 'object') return false;
    const p = o as Record<string, unknown>;
    if (typeof p.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(p.id) || ids.has(p.id))
      return false;
    ids.add(p.id);
    return (
      typeof p.x === 'number' &&
      Number.isFinite(p.x) &&
      Math.abs(p.x) <= 1_000_000 &&
      typeof p.y === 'number' &&
      Number.isFinite(p.y) &&
      Math.abs(p.y) <= 1_000_000 &&
      isExpression(p.node) &&
      (p.body === undefined ||
        (isBody(p.body) &&
          p.node.kind === 'quantity' &&
          p.node.quantity === 'mass' &&
          p.node.value === p.body.mass)) &&
      (p.vectorParts === undefined ||
        (Array.isArray(p.vectorParts) &&
          p.vectorParts.length === 2 &&
          p.vectorParts.every((n) => isExpression(n) && n.kind === 'vector')))
    );
  });
}
export function parseSaved(raw: string | null): SavedState {
  const initial = defaults();
  if (!raw || raw.length > 5_000_000) return initial;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return initial;
    const v = value as Record<string, unknown>;
    if (v.version !== 1) return initial;
    const s = v.sandboxes as Record<string, unknown> | undefined;
    const settings = v.settings as Record<string, unknown> | undefined;
    return {
      version: 1,
      sandboxes: {
        math: isScene(s?.math) ? s.math : emptyScene(),
        physics: isScene(s?.physics) ? s.physics : emptyScene(),
      },
      settings: {
        muted: typeof settings?.muted === 'boolean' ? settings.muted : true,
        trails: typeof settings?.trails === 'boolean' ? settings.trails : true,
      },
      tutorialComplete: v.tutorialComplete === true,
      progress: Array.isArray(v.progress)
        ? [
            ...new Set(
              v.progress.filter(
                (n: unknown): n is number =>
                  typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 10,
              ),
            ),
          ]
        : [],
    };
  } catch {
    return initial;
  }
}
export function loadSaved(): SavedState {
  try {
    return parseSaved(localStorage.getItem(STORAGE_KEY));
  } catch {
    return defaults();
  }
}
