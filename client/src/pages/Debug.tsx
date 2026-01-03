import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { clearErrorLogs, ERROR_LOG_KEY, getErrorLogs, type ErrorLogEntry } from "@/lib/errorLog";
import { safeRemove } from "@/lib/utils";

export default function Debug() {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    setLogs(getErrorLogs());
  }, []);

  const serialized = useMemo(() => JSON.stringify(logs, null, 2), [logs]);
  const latestLogs = useMemo(() => logs.slice(-10).reverse(), [logs]);

  const refresh = () => {
    setLogs(getErrorLogs());
    setCopyStatus("idle");
  };

  const handleCopy = async () => {
    if (!serialized) return;
    try {
      await navigator.clipboard.writeText(serialized);
      setCopyStatus("copied");
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = serialized;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        if (!document.body) throw new Error("document.body not available");
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        safeRemove(textarea);
        setCopyStatus("copied");
      } catch {
        setCopyStatus("failed");
      }
    }
  };

  const handleClear = () => {
    clearErrorLogs();
    setLogs([]);
    setCopyStatus("idle");
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">診断ログ</h1>
          <p className="text-xs text-muted-foreground">
            localStorage key: <span className="font-mono">{ERROR_LOG_KEY}</span>
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleCopy} disabled={!logs.length}>
            Copy All
          </Button>
          <Button size="sm" variant="secondary" onClick={refresh}>
            更新
          </Button>
          <Button size="sm" variant="destructive" onClick={handleClear} disabled={!logs.length}>
            Clear Logs
          </Button>
          {copyStatus === "copied" && (
            <span className="text-xs text-muted-foreground self-center">コピー済み</span>
          )}
          {copyStatus === "failed" && (
            <span className="text-xs text-destructive self-center">コピーに失敗しました</span>
          )}
        </div>

        <div className="space-y-2">
          {latestLogs.length === 0 && (
            <div className="text-xs text-muted-foreground">ログはありません。</div>
          )}
          {latestLogs.map((entry, index) => (
            <details key={`${entry.time}-${index}`} className="rounded-md border border-border/60 bg-black/40 p-3">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                <span className="font-mono">{entry.time}</span>{" "}
                <span className="opacity-70">{entry.route || "-"}</span>{" "}
                <span className="text-red-300">{entry.message}</span>
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-all text-[10px] text-red-200/80">
                {JSON.stringify(entry, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
