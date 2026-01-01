import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error stack:', error.stack);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleGoHome = () => {
    // Reset state and navigate home
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-md p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-6">
              <AlertTriangle
                size={32}
                className="text-destructive"
              />
            </div>

            <h2 className="text-xl font-bold mb-2 text-foreground">
              エラーが発生しました
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              予期せぬエラーが発生しました。<br />
              ページを再読み込みするか、ホームに戻ってください。
            </p>

            {/* Show error message in collapsed details */}
            <details className="w-full mb-6 text-left">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                エラー詳細を表示
              </summary>
              <div className="p-3 mt-2 rounded bg-muted overflow-auto max-h-32">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                  {this.state.error?.message || 'Unknown error'}
                </pre>
              </div>
            </details>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-3 rounded-lg w-full",
                  "bg-primary text-primary-foreground font-bold",
                  "hover:opacity-90 cursor-pointer transition-opacity"
                )}
              >
                <RotateCcw size={18} />
                ページを再読み込み
              </button>

              <button
                onClick={this.handleGoHome}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-3 rounded-lg w-full",
                  "bg-transparent border border-white/20 text-foreground",
                  "hover:bg-white/5 cursor-pointer transition-colors"
                )}
              >
                <Home size={18} />
                ホームに戻る
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
