import {
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";

export type DraftStore<T> = {
  get: () => T;
  set: Dispatch<SetStateAction<T>>;
  subscribe: (listener: () => void) => () => void;
};

function createDraftStore<T>(initialValue: T): DraftStore<T> {
  let value = initialValue;
  const listeners = new Set<() => void>();

  return {
    get: () => value,
    set: (next) => {
      const nextValue =
        typeof next === "function"
          ? (next as (current: T) => T)(value)
          : next;

      if (Object.is(nextValue, value)) {
        return;
      }

      value = nextValue;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

// Entwurfszustand lebt so lange wie der besitzende Workflow, rendert bei Änderungen aber nur die lesenden Teilkomponenten neu.
export function useDraftStore<T>(initialValue: T) {
  const [store] = useState(() => createDraftStore(initialValue));

  return store;
}

export function useDraftValue<T>(
  store: DraftStore<T>,
): [T, Dispatch<SetStateAction<T>>] {
  return [useSyncExternalStore(store.subscribe, store.get, store.get), store.set];
}
