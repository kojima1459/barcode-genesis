export type ErrorLogEntry = {
  time: string;
  route: string;
  message: string;
  stack?: string;
  componentStack?: string;
};

export const ERROR_LOG_KEY = "bg_error_logs";
const MAX_LOGS = 50;

const readLogs = (): ErrorLogEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ERROR_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const time = typeof entry.time === "string" ? entry.time : undefined;
        const route = typeof entry.route === "string" ? entry.route : "";
        const message = typeof entry.message === "string" ? entry.message : "Unknown error";
        const stack = typeof entry.stack === "string" ? entry.stack : undefined;
        const componentStack = typeof entry.componentStack === "string" ? entry.componentStack : undefined;
        if (!time) return null;
        return { time, route, message, stack, componentStack } as ErrorLogEntry;
      })
      .filter(Boolean) as ErrorLogEntry[];
  } catch {
    return [];
  }
};

const writeLogs = (logs: ErrorLogEntry[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(logs));
  } catch {
    // Ignore storage errors to avoid cascading failures
  }
};

export const addErrorLog = (entry: Omit<ErrorLogEntry, "time">) => {
  try {
    const logs = readLogs();
    const next: ErrorLogEntry = {
      time: new Date().toISOString(),
      route: entry.route || "",
      message: entry.message || "Unknown error",
      stack: entry.stack,
      componentStack: entry.componentStack,
    };
    const updated = [...logs, next].slice(-MAX_LOGS);
    writeLogs(updated);
  } catch {
    // Ignore logging failures to avoid cascading errors
  }
};

export const getErrorLogs = (): ErrorLogEntry[] => readLogs();

export const clearErrorLogs = () => {
  writeLogs([]);
};

const stringifyReason = (reason: unknown) => {
  if (reason instanceof Error) {
    return { message: reason.message, stack: reason.stack };
  }
  if (typeof reason === "string") {
    return { message: reason };
  }
  try {
    return { message: JSON.stringify(reason) };
  } catch {
    return { message: String(reason) };
  }
};

export const registerGlobalErrorHandlers = () => {
  if (typeof window === "undefined") return () => undefined;

  const onError = (event: ErrorEvent) => {
    try {
      addErrorLog({
        route: window.location.pathname + window.location.search,
        message: event.message || "Unknown error",
        stack: event.error?.stack,
      });
    } catch {
      // Ignore logging failures to avoid cascading errors
    }
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    try {
      const reason = stringifyReason(event.reason);
      addErrorLog({
        route: window.location.pathname + window.location.search,
        message: reason.message || "Unhandled rejection",
        stack: reason.stack,
      });
    } catch {
      // Ignore logging failures to avoid cascading errors
    }
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
};
