import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { vector, type Expression } from '../ast/types';
import { encodePath, getPart, type ExpressionPath } from '../ast/parts';
import { useGameStore } from '../store/useGameStore';
import type { WorldObject } from '../store/types';
import { VECTOR_SCALE } from '../utils/layout';
import type { TrayElement } from './Tray';
import { boxDistance, findDropTarget, type DropTarget } from './dropTarget';

export interface DragState {
  pointerId: number;
  node: Expression;
  sourceId?: string;
  sourcePath?: ExpressionPath;
  intentPath?: ExpressionPath;
  trayKey?: string;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  moved: boolean;
  touch: boolean;
  endpoint?: 'start' | 'end';
  original?: WorldObject;
}
export function useDrag(stage: RefObject<HTMLDivElement | null>) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);
  const dragRef = useRef<DragState | null>(null),
    dropRef = useRef<DropTarget | null>(null);
  const update = useCallback((d: DragState | null) => {
    dragRef.current = d;
    setDrag(d);
  }, []);
  const cancel = useCallback(() => {
    update(null);
    setDrop(null);
    dropRef.current = null;
  }, [update]);
  const begin = (
    e: ReactPointerEvent,
    node: Expression,
    source?: WorldObject,
    trayKey?: string,
    endpoint?: 'start' | 'end',
    sourcePath?: ExpressionPath,
  ) => {
    if (e.button !== 0 || dragRef.current) return;
    const state = useGameStore.getState();
    if (source?.body && state.running) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = stage.current?.getBoundingClientRect();
    if (!rect) return;
    if (source) {
      state.settle(source.id);
      if (sourcePath) state.selectPart(source.id, sourcePath);
      else state.select(source.id);
    }
    if (sourcePath && node.kind === 'hole') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const px = e.clientX - rect.left,
      py = e.clientY - rect.top;
    const partBox = sourcePath
      ? (e.target as Element).closest('[data-node-path]')?.getBoundingClientRect()
      : null;
    const x = partBox ? partBox.left + partBox.width / 2 - rect.left : (source?.x ?? px);
    const y = partBox ? partBox.top + partBox.height / 2 - rect.top : (source?.y ?? py);
    update({
      pointerId: e.pointerId,
      node,
      sourceId: source?.id,
      sourcePath,
      trayKey,
      x,
      y,
      offsetX: source ? px - x : 0,
      offsetY: source ? py - y : 0,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      touch: e.pointerType === 'touch',
      endpoint,
      original: source,
    });
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current,
        element = stage.current,
        rect = element?.getBoundingClientRect();
      if (!d || d.pointerId !== e.pointerId || !element || !rect) return;
      const moved =
        d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > (d.touch ? 8 : 5);
      if (!moved) return;
      let x = e.clientX - rect.left - d.offsetX,
        y = e.clientY - rect.top - d.offsetY,
        node = d.node;
      if (d.endpoint && d.original?.node.kind === 'vector') {
        const original = d.original,
          v = original.node;
        if (v.kind !== 'vector') return;
        const dx = (e.clientX - d.startX) / VECTOR_SCALE,
          dy = -(e.clientY - d.startY) / VECTOR_SCALE;
        const snap = (v: number) => Math.round(v * 4) / 4;
        if (d.endpoint === 'end') {
          x = original.x;
          y = original.y;
          node = vector(snap(v.x + dx), snap(v.y + dy));
        } else {
          node = vector(snap(v.x - dx), snap(v.y - dy));
          x = original.x + (v.x - node.x) * VECTOR_SCALE;
          y = original.y - (v.y - node.y) * VECTOR_SCALE;
        }
      }
      const next = { ...d, node, x, y, moved };
      const target =
        useGameStore.getState().moveOnly || e.altKey
          ? null
          : findDropTarget(element, next, e.clientX, e.clientY, dropRef.current);
      dropRef.current = target;
      setDrop(target);
      update(next);
    };
    const end = (e: PointerEvent) => {
      if (dragRef.current?.pointerId !== e.pointerId) return;
      move(e);
      const d = dragRef.current,
        rect = stage.current?.getBoundingClientRect();
      if (!d || !rect) return;
      const state = useGameStore.getState(),
        bounds = { width: rect.width, height: rect.height };
      const inside = boxDistance(e.clientX, e.clientY, rect) === 0;
      const target = dropRef.current;
      if (d.moved && inside) {
        if (target?.id === '__grid') state.applyMatrix(d.node, d.sourceId);
        else if (target) {
          const accepted = state.react(
            target.id,
            d.node,
            d.sourceId,
            bounds,
            target.path,
            d.sourcePath,
          );
          if (accepted && d.trayKey) state.observeTray(d.trayKey);
          if (!accepted && !d.sourceId) state.addObject(d.node, d.x, d.y, bounds, d.trayKey);
        } else if (d.sourceId && d.sourcePath) {
          const box = Array.from(
            stage.current?.querySelectorAll<HTMLElement>('[data-object-id]') ?? [],
          )
            .find((el) => el.dataset.objectId === d.sourceId)
            ?.getBoundingClientRect();
          if (!box || boxDistance(e.clientX, e.clientY, box) > 12)
            state.extractPart(d.sourceId, d.sourcePath, bounds, { x: d.x, y: d.y });
        } else if (d.sourceId)
          state.moveObject(
            d.sourceId,
            Math.max(24, Math.min(rect.width - 24, d.x)),
            Math.max(24, Math.min(rect.height - 24, d.y)),
            bounds,
            d.endpoint ? d.node : undefined,
          );
        else state.addObject(d.node, d.x, d.y, bounds, d.trayKey);
      } else if (!d.moved && d.sourceId && d.intentPath) {
        state.selectPart(d.sourceId, d.intentPath);
      } else if (!d.moved && !d.sourceId) {
        state.addObject(d.node, bounds.width * 0.43, bounds.height * 0.5, bounds, d.trayKey);
      }
      cancel();
    };
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', keydown);
    };
  }, [stage, cancel, update]);
  return {
    drag,
    drop,
    target: drop?.id ?? null,
    cancel,
    startTray: (e: ReactPointerEvent, item: TrayElement) =>
      begin(e, item.node, undefined, item.key),
    startObject: (e: ReactPointerEvent, o: WorldObject) => begin(e, o.node, o),
    startPart: (e: ReactPointerEvent, o: WorldObject, path: ExpressionPath) => {
      const node = getPart(o.node, path);
      if (!node) return;
      const state = useGameStore.getState();
      if (state.moveOnly || e.altKey) {
        begin(e, o.node, o);
        return;
      }
      if (state.selected === o.id && encodePath(state.selectedPart ?? []) === encodePath(path))
        begin(e, node, o, undefined, undefined, path);
      else {
        begin(e, o.node, o);
        if (dragRef.current) update({ ...dragRef.current, intentPath: path });
      }
    },
    startEndpoint: (e: ReactPointerEvent, o: WorldObject, endpoint: 'start' | 'end') =>
      begin(e, o.node, o, undefined, endpoint),
  };
}
