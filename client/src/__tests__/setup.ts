import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

type MockDoc = { id: string; data: Record<string, unknown> };

type Listener = (snapshot: any) => void;

const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();
const mockLoad = vi.fn();

if (typeof window !== "undefined") {
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: mockPlay,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: mockPause,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "load", {
    configurable: true,
    value: mockLoad,
  });

  (globalThis as any).Audio = function Audio(src?: string) {
    const audio = document.createElement("audio");
    if (src) audio.src = src;
    return audio;
  };

  if (!window.matchMedia) {
    window.matchMedia = (query: string) => {
      const prefersReduced =
        (globalThis as any).__prefersReducedMotion === true &&
        query.includes("prefers-reduced-motion");
      return {
        matches: prefersReduced,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList;
    };
  }
}

const listeners = new Map<string, Set<Listener>>();
const docStore = new Map<string, Record<string, unknown>>();
const collectionStore = new Map<string, MockDoc[]>();

const ensureSet = (key: string) => {
  const existing = listeners.get(key);
  if (existing) return existing;
  const next = new Set<Listener>();
  listeners.set(key, next);
  return next;
};

const makeDocSnapshot = (data: Record<string, unknown> | null) => ({
  exists: () => data !== null,
  data: () => data ?? undefined,
});

const makeQuerySnapshot = (docs: MockDoc[]) => ({
  docs: docs.map((doc) => ({
    id: doc.id,
    data: () => doc.data,
  })),
  size: docs.length,
  forEach: (cb: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
    docs.forEach((doc) => cb({ id: doc.id, data: () => doc.data }));
  },
});

const firestoreMock = {
  collectionGroup: vi.fn(),
  emitDoc(path: string, data: Record<string, unknown> | null) {
    const key = `doc:${path}`;
    if (data === null) {
      docStore.delete(key);
    } else {
      docStore.set(key, data);
    }
    const set = listeners.get(key);
    if (!set) return;
    const snapshot = makeDocSnapshot(data);
    set.forEach((cb) => cb(snapshot));
  },
  emitCollection(path: string, docs: MockDoc[]) {
    const keys = [`collection:${path}`, `query:collection:${path}`];
    collectionStore.set(`collection:${path}`, docs);
    keys.forEach((key) => {
      const set = listeners.get(key);
      if (!set) return;
      const snapshot = makeQuerySnapshot(docs);
      set.forEach((cb) => cb(snapshot));
    });
  },
  setDoc(path: string, data: Record<string, unknown>) {
    docStore.set(`doc:${path}`, data);
  },
  setCollection(path: string, docs: MockDoc[]) {
    collectionStore.set(`collection:${path}`, docs);
  },
  getListenerKeys() {
    return Array.from(listeners.keys());
  },
  reset() {
    listeners.clear();
    docStore.clear();
    collectionStore.clear();
    firestoreMock.collectionGroup.mockClear();
  },
};

const authState = {
  user: null as { uid: string } | null,
  loading: false,
};

(globalThis as any).__firestoreMock = firestoreMock;
(globalThis as any).__authState = authState;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    ...authState,
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock("@/contexts/SoundContext", () => ({
  useSound: () => ({ playBGM: vi.fn(), playSE: vi.fn() }),
}));

vi.mock("@/hooks/useRobotFx", () => ({
  useRobotFx: () => ({ fx: { variant: "idle", nonce: 0 }, trigger: vi.fn() }),
}));

vi.mock("@/components/SEO", () => ({
  default: () => null,
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
  functions: {},
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: vi.fn(() => Object.assign(vi.fn(async () => ({ data: {} })), { stream: vi.fn() })),
}));

vi.mock("firebase/firestore", () => {
  const collection = (...args: any[]) => ({
    _key: `collection:${args.slice(1).join("/")}`,
  });
  const doc = (...args: any[]) => ({
    _key: `doc:${args.slice(1).join("/")}`,
  });
  const query = (ref: { _key: string }) => ({
    _key: `query:${ref._key}`,
  });

  const onSnapshot = (ref: { _key: string }, onNext: Listener) => {
    const set = ensureSet(ref._key);
    set.add(onNext);
    return () => set.delete(onNext);
  };

  return {
    collection,
    collectionGroup: firestoreMock.collectionGroup,
    doc,
    getDoc: vi.fn(async (ref: { _key: string }) => {
      const data = docStore.has(ref._key) ? (docStore.get(ref._key) as Record<string, unknown>) : null;
      return makeDocSnapshot(data);
    }),
    getDocs: vi.fn(async (ref: { _key: string }) => {
      const key = ref._key.replace(/^query:/, "");
      const docs = collectionStore.get(key) ?? [];
      return makeQuerySnapshot(docs);
    }),
    onSnapshot,
    orderBy: vi.fn(),
    query,
    setDoc: vi.fn(async () => { }),
    updateDoc: vi.fn(async () => { }),
  };
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  firestoreMock.reset();
});
