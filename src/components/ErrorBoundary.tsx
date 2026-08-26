import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare props: Props;
  declare setState: (state: Partial<State> | ((prevState: State) => Partial<State>), callback?: () => void) => void;

  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-off-white font-sans">
          <div className="max-w-md w-full bg-white p-8 border border-black/10 shadow-sm space-y-6">
            <div className="w-12 h-12 rounded-full bg-orange/10 text-orange flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight text-ink">
                {this.props.fallbackTitle || "An unexpected error occurred"}
              </h2>
              <p className="text-xs text-ink/60 mt-2 font-mono break-all bg-black/5 p-3 rounded-none">
                {this.state.error?.message || "Render crashed"}
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white text-xs font-bold uppercase tracking-wider hover:bg-cobalt transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                Refresh Page
              </button>
              <a
                href="/"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-black/5 text-ink text-xs font-bold uppercase tracking-wider hover:bg-black/10 transition-colors"
              >
                <Home size={13} />
                Go to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
