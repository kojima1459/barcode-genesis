import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

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
        <div className="flex items-center justify-center min-h-screen p-4 bg-black relative overflow-hidden text-foreground font-sans">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
          <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/80 pointer-events-none" />

          <div className="glass-panel p-8 rounded-2xl border-red-500/30 flex flex-col items-center w-full max-w-md text-center relative z-10 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 animate-pulse border border-red-500/30">
              <AlertTriangle
                size={40}
                className="text-red-500"
              />
            </div>

            <h2 className="text-2xl font-bold mb-2 text-white font-orbitron tracking-wider">
              SYSTEM ERROR
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              システムエラーが発生しました。<br />
              再起動を試みるか、基地へ帰還してください。
            </p>

            {/* Show error message in collapsed details */}
            <details className="w-full mb-8 text-left bg-black/40 rounded border border-white/5 p-3">
              <summary className="text-xs text-red-400/80 cursor-pointer hover:text-red-400 font-mono flex items-center gap-2">
                <span className="opacity-50">&gt;</span> VIEW_ERROR_LOG
              </summary>
              <div className="mt-2 overflow-auto max-h-32">
                <pre className="text-[10px] text-red-500/70 whitespace-pre-wrap break-all font-mono">
                  {this.state.error?.message || 'Unknown protocol failure'}
                </pre>
              </div>
            </details>

            <div className="flex flex-col w-full gap-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 tracking-wide"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                REBOOT SYSTEM
              </Button>

              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 h-10"
              >
                <Home className="mr-2 h-4 w-4" />
                RETURN TO BASE
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
