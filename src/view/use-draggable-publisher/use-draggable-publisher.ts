import type { Position } from 'css-box-model';
import { useMemo, useCallback } from 'use-memo-one';
import { useRef } from 'react';
import { invariant } from '../../invariant';
import type {
  DraggableDescriptor,
  DraggableDimension,
  Id,
  DraggableOptions,
} from '../../types';
import type {
  Registry,
  DraggableEntry,
} from '../../state/registry/registry-types';
import makeDimension from './get-dimension';
import useLayoutEffect from '../use-isomorphic-layout-effect';
import useUniqueId from '../use-unique-id';

export interface Args extends DraggableOptions {
  descriptor: DraggableDescriptor;
  getDraggableRef: () => HTMLElement | null;
  registry: Registry;
}

export default function useDraggablePublisher(args: Args) {
  const uniqueId: Id = useUniqueId('draggable');

  const {
    descriptor,
    registry,
    getDraggableRef,
    canDragInteractiveElements,
    shouldRespectForcePress,
    isEnabled,
    allowKeyModifiers,
  } = args;

  const options: DraggableOptions = useMemo(
    () => ({
      canDragInteractiveElements,
      shouldRespectForcePress,
      isEnabled,
      allowKeyModifiers,
    }),
    [
      canDragInteractiveElements,
      isEnabled,
      shouldRespectForcePress,
      allowKeyModifiers,
    ],
  );

  const getDimension = useCallback(
    (windowScroll?: Position): DraggableDimension => {
      const el: HTMLElement | null = getDraggableRef();
      invariant(el, 'Cannot get dimension when no ref is set');
      return makeDimension(descriptor, el, windowScroll);
    },
    [descriptor, getDraggableRef],
  );

  const entry: DraggableEntry = useMemo(
    () => ({
      uniqueId,
      descriptor,
      options,
      getDimension,
    }),
    [descriptor, getDimension, options, uniqueId],
  );

  const publishedRef = useRef<DraggableEntry>(entry);
  const isFirstPublishRef = useRef<boolean>(true);

  // mounting and unmounting
  useLayoutEffect(() => {
    registry.draggable.register(publishedRef.current);
    return () => registry.draggable.unregister(publishedRef.current);
  }, [registry.draggable]);

  // updates while mounted
  useLayoutEffect(() => {
    if (isFirstPublishRef.current) {
      isFirstPublishRef.current = false;
      return;
    }

    const last: DraggableEntry = publishedRef.current;
    publishedRef.current = entry;
    registry.draggable.update(entry, last);
  }, [entry, registry.draggable]);
}
