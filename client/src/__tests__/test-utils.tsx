import React, { ReactElement } from "react";
import { render } from "@testing-library/react";
import { Router, Route, Switch, Redirect, useLocation, useSearch } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dex from "@/pages/Dex";
import Workshop from "@/pages/Workshop";
import Battle from "@/pages/Battle";
import HowTo from "@/pages/HowTo";
import Shop from "@/pages/Shop";

type FirestoreMock = {
  collectionGroup: { mock: { calls: unknown[][] } };
  emitDoc: (path: string, data: Record<string, unknown> | null) => void;
  emitCollection: (path: string, docs: { id: string; data: Record<string, unknown> }[]) => void;
  setDoc: (path: string, data: Record<string, unknown>) => void;
  setCollection: (path: string, docs: { id: string; data: Record<string, unknown> }[]) => void;
  getListenerKeys: () => string[];
};

export const getFirestoreMock = () => (globalThis as any).__firestoreMock as FirestoreMock;

export const setAuthState = (next: { user: { uid: string } | null; loading?: boolean }) => {
  const authState = (globalThis as any).__authState as { user: { uid: string } | null; loading: boolean };
  authState.user = next.user;
  if (typeof next.loading === "boolean") authState.loading = next.loading;
};

const Login = () => <div>Login</div>;

const LocationDisplay = () => {
  const [path] = useLocation();
  const search = useSearch();
  const fullPath = search ? `${path}?${search}` : path;
  return <div data-testid="location">{fullPath}</div>;
};

const TestRoutes = () => (
  <>
    <LocationDisplay />
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/auth">
        <Redirect to="/login" />
      </Route>
      <Route path="/dex">
        <ProtectedRoute component={Dex} />
      </Route>
      <Route path="/workshop">
        <ProtectedRoute component={Workshop} />
      </Route>
      <Route path="/battle">
        <ProtectedRoute component={Battle} />
      </Route>
      <Route path="/how-to">
        <ProtectedRoute component={HowTo} />
      </Route>
      <Route path="/shop">
        <ProtectedRoute component={Shop} />
      </Route>
    </Switch>
  </>
);

export const renderWithRouter = (path: string, ui?: ReactElement) => {
  const memory = memoryLocation({ path });
  const content = ui ?? <TestRoutes />;
  const result = render(<Router hook={memory.hook}>{content}</Router>);
  return { ...result, navigate: memory.navigate };
};

export const createRobotDoc = (overrides?: Record<string, unknown>) => ({
  id: "robot-1",
  data: {
    name: "Robot One",
    baseHp: 100,
    baseAttack: 10,
    baseDefense: 10,
    baseSpeed: 10,
    level: 1,
    parts: {
      head: 1,
      face: 1,
      body: 1,
      armLeft: 1,
      armRight: 1,
      legLeft: 1,
      legRight: 1,
      backpack: 1,
      weapon: 1,
      accessory: 1,
    },
    colors: {
      primary: "#111111",
      secondary: "#222222",
      accent: "#333333",
      glow: "#444444",
    },
    ...overrides,
  },
});

export const createVariantDoc = (overrides?: Record<string, unknown>) => ({
  id: "variant-1",
  data: {
    name: "Variant One",
    parentRobotIds: ["robot-a", "robot-b"],
    parts: {
      head: 2,
      face: 2,
      body: 2,
      armLeft: 2,
      armRight: 2,
      legLeft: 2,
      legRight: 2,
      backpack: 2,
      weapon: 2,
      accessory: 2,
    },
    colors: {
      primary: "#aaaaaa",
      secondary: "#bbbbbb",
      accent: "#cccccc",
      glow: "#dddddd",
    },
    ...overrides,
  },
});
