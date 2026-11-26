import { combinePart, engine, type ReactionResult } from '../engine/ReactionEngine';
import { decodePath, encodePath, getPart, type ExpressionPath } from '../ast/parts';
import { useGameStore } from '../store/useGameStore';
import { objectSize, VECTOR_SCALE } from '../utils/layout';
import type { DragState } from './useDrag';

export interface DropTarget {
  id: string;
  path: ExpressionPath;
  reaction?: ReactionResult;
  label: string;
}
export interface HitBox {
  left: number;
  top: number;
  width: number;
  height: number;
}
export function boxDistance(x: number, y: number, box: HitBox): number {
  return Math.hypot(
    Math.max(0, box.left - x, x - box.left - box.width),
    Math.max(0, box.top - y, y - box.top - box.height),
  );
}
export function hitScore(
  pointer: { x: number; y: number },
  center: { x: number; y: number },
  box: HitBox,
  size: { width: number; height: number },
  sticky: boolean,
  touch: boolean,
): number | null {
  const distance = Math.min(
    boxDistance(pointer.x, pointer.y, box),
    boxDistance(center.x, center.y, {
      left: box.left - size.width / 2,
      top: box.top - size.height / 2,
      width: box.width + size.width,
      height: box.height + size.height,
    }),
  );
  if (distance > (touch ? 62 : 46) + (sticky ? 18 : 0)) return null;
  const centerDistance = Math.hypot(
    pointer.x - box.left - box.width / 2,
    pointer.y - box.top - box.height / 2,
  );
  return (
    distance * 5 +
    centerDistance * 0.2 -
    (boxDistance(pointer.x, pointer.y, box) === 0 ? 200 : 0) -
    (sticky ? 12 : 0)
  );
}
export function findDropTarget(
  stage: HTMLDivElement,
  drag: DragState,
  clientX: number,
  clientY: number,
  previous: DropTarget | null,
): DropTarget | null {
  if (drag.endpoint) return null;
  const rect = stage.getBoundingClientRect(),
    state = useGameStore.getState();
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom)
    return null;
  const pointer = { x: clientX - rect.left, y: clientY - rect.top },
    center = { x: drag.x, y: drag.y };
  const size = objectSize(drag.node);
  let best: DropTarget | null = null,
    bestScore = Infinity;
  for (const object of state.scene.objects) {
    if (object.id === drag.sourceId) continue;
    const element = stage.querySelector(`[data-object-id="${object.id}"]`),
      box = element?.getBoundingClientRect();
    if (!box) continue;
    const sticky = previous?.id === object.id;
    let score: number | null;
    if (drag.node.kind === 'vector' && object.node.kind === 'vector') {
      const distance = Math.hypot(
        center.x - object.x - object.node.x * VECTOR_SCALE,
        center.y - object.y + object.node.y * VECTOR_SCALE,
      );
      score =
        distance <= (drag.touch ? 78 : 60) + (sticky ? 18 : 0)
          ? distance - (sticky ? 12 : 0)
          : null;
    } else
      score = hitScore(
        pointer,
        center,
        {
          left: box.left - rect.left,
          top: box.top - rect.top,
          width: box.width,
          height: box.height,
        },
        size,
        sticky,
        drag.touch,
      );
    if (score === null) continue;
    let path: ExpressionPath = [],
      reaction = engine.combine(object.node, drag.node, { targetIsBody: Boolean(object.body) });
    let partScore = Infinity;
    for (const partElement of element!.querySelectorAll<HTMLElement>('[data-node-path]')) {
      const p = decodePath(partElement.dataset.nodePath ?? null),
        part = getPart(object.node, p);
      if (!p.length || !part) continue;
      // A chosen part or an empty slot is intentional. Otherwise prefer the whole expression.
      const chosen =
        state.selected === object.id && encodePath(state.selectedPart ?? []) === encodePath(p);
      const slot =
        part.kind === 'hole' ||
        (part.kind === 'operator' && Boolean(part.left)) ||
        ((part.kind === 'function' || part.kind === 'root') && part.argument === null);
      if (!slot && !chosen) continue;
      const partBox = partElement.getBoundingClientRect();
      const distance = boxDistance(clientX, clientY, partBox);
      if (distance > (slot ? (drag.touch ? 58 : 44) : 24)) continue;
      const candidate = combinePart(object.node, p, drag.node);
      const rank = distance - p.length * 2;
      if (candidate && rank < partScore) {
        partScore = rank;
        path = p;
        reaction = candidate;
      }
    }
    if (!reaction) continue;
    if (path.length) score -= 70;
    if (score < bestScore) {
      bestScore = score;
      best = {
        id: object.id,
        path,
        reaction,
        label: path.length
          ? getPart(object.node, path)?.kind === 'hole'
            ? 'ここに入れる'
            : '選んだ部分とつなぐ'
          : object.body
            ? '物体に適用'
            : 'この式とつなぐ',
      };
    }
  }
  if (!best && drag.node.kind === 'matrix' && state.scene.grid) {
    const box = stage.querySelector('.coordinate-grid')?.getBoundingClientRect();
    if (box && boxDistance(clientX, clientY, box) < 30)
      best = { id: '__grid', path: [], label: 'グリッドに適用' };
  }
  return best;
}
