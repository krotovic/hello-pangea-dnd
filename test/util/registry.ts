import type { Position } from 'css-box-model';
import type {
  Id,
  DraggableId,
  DroppableId,
  DraggableDimension,
  DroppableDimension,
  DimensionMap,
  DraggableOptions,
} from '../../src/types';
import type {
  DroppableCallbacks,
  Registry,
  DraggableEntry,
  DroppableEntry,
} from '../../src/state/registry/registry-types';
import { getPreset } from './dimension';
import { origin } from '../../src/state/position';

interface DraggableArgs {
  uniqueId?: Id;
  dimension: DraggableDimension;
}

const defaultOptions: DraggableOptions = {
  canDragInteractiveElements: true,
  shouldRespectForcePress: false,
  isEnabled: true,
  allowKeyModifiers: false,
};

const getUniqueId = (() => {
  let count = 0;
  return function create(): Id {
    return `unique-id-${count++}`;
  };
})();

export function getDraggableEntry({
  uniqueId = getUniqueId(),
  dimension,
}: DraggableArgs): DraggableEntry {
  return {
    uniqueId,
    descriptor: dimension.descriptor,
    options: defaultOptions,
    getDimension: () => dimension,
  };
}

export const getDroppableCallbacks = (
  dimension: DroppableDimension,
): DroppableCallbacks => ({
  getDimensionAndWatchScroll: jest.fn().mockReturnValue(dimension),
  getScrollWhileDragging: jest.fn().mockReturnValue(origin),
  scroll: jest.fn(),
  dragStopped: jest.fn(),
});

interface DroppableArgs {
  uniqueId?: Id;
  dimension: DroppableDimension;
}

export function getDroppableEntry({
  uniqueId = getUniqueId(),
  dimension,
}: DroppableArgs): DroppableEntry {
  return {
    uniqueId,
    descriptor: dimension.descriptor,
    callbacks: getDroppableCallbacks(dimension),
  };
}

export interface DimensionWatcher {
  draggable: {
    getDimension: jest.Mock;
  };
  droppable: {
    getDimensionAndWatchScroll: jest.Mock;
    scroll: jest.Mock;
    getScrollWhileDragging: jest.Mock;
    dragStopped: jest.Mock;
  };
}

const preset = getPreset();

export const populate = (
  registry: Registry,
  dimensions: DimensionMap = preset.dimensions,
): DimensionWatcher => {
  const { draggables, droppables } = dimensions;
  const watcher: DimensionWatcher = {
    draggable: {
      getDimension: jest.fn(),
    },
    droppable: {
      getDimensionAndWatchScroll: jest.fn(),
      scroll: jest.fn(),
      getScrollWhileDragging: jest.fn(),
      dragStopped: jest.fn(),
    },
  };

  Object.keys(droppables).forEach((id: DroppableId) => {
    const droppable: DroppableDimension = droppables[id];
    const callbacks: DroppableCallbacks = {
      getDimensionAndWatchScroll: () => {
        watcher.droppable.getDimensionAndWatchScroll(id);
        return droppable;
      },
      scroll: (change: Position) => {
        watcher.droppable.scroll(id, change);
      },
      getScrollWhileDragging: () => {
        const scroll: Position = droppable.frame
          ? droppable.frame.scroll.current
          : origin;

        watcher.droppable.getScrollWhileDragging(id, scroll);
        return scroll;
      },
      dragStopped: () => {
        watcher.droppable.dragStopped(id);
      },
    };

    const entry: DroppableEntry = {
      uniqueId: droppable.descriptor.id,
      descriptor: droppable.descriptor,
      callbacks,
    };

    registry.droppable.register(entry);
  });

  Object.keys(draggables).forEach((id: DraggableId) => {
    const draggable: DraggableDimension = draggables[id];
    const getDimension = (): DraggableDimension => {
      watcher.draggable.getDimension(id);
      return draggable;
    };

    const entry: DraggableEntry = {
      uniqueId: draggable.descriptor.id,
      descriptor: draggable.descriptor,
      options: defaultOptions,
      getDimension,
    };

    registry.draggable.register(entry);
  });

  return watcher;
};

export const resetWatcher = (watcher: DimensionWatcher): void => {
  watcher.draggable.getDimension.mockReset();
  (
    Object.keys(watcher.droppable) as Array<keyof typeof watcher.droppable>
  ).forEach((key) => {
    watcher.droppable[key].mockReset();
  });
};
