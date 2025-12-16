import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
          <div className="max-w-md w-full mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-8 border border-red-200 dark:border-red-900">
              {/* Error Icon */}
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>

              {/* Error Title */}
              <h2 className="mt-4 text-xl font-bold text-center text-slate-900 dark:text-white">
                Oops! Something went wrong
              </h2>

              {/* Error Message */}
              <p className="mt-2 text-center text-slate-600 dark:text-slate-400 text-sm">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>

              {/* Error Details (Development Only) */}
              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                  <summary className="cursor-pointer text-xs font-mono text-red-700 dark:text-red-400">
                    Error Details
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-40 text-red-600 dark:text-red-300">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
                <button
                  onClick={() => (window.location.href = "/")}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium rounded-lg transition-colors"
                >
                  Go Home
                </button>
              </div>

              {/* Help Text */}
              <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-500">
                If the problem persists, please{" "}
                <a
                  href="mailto:support@stockdash.com"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  contact support
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
