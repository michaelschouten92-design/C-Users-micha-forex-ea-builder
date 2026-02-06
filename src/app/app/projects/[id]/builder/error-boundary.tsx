"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for the Strategy Canvas.
 *
 * Catches JavaScript errors in child components and displays
 * a fallback UI instead of crashing the whole page.
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error("Canvas error:", error);
    console.error("Component stack:", errorInfo.componentStack);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex-1 flex items-center justify-center bg-[#0F0A1A]">
          <div className="max-w-md w-full mx-4 p-8 bg-[#1A0626] border border-[rgba(239,68,68,0.3)] rounded-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[#EF4444]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-white mb-2">
              Something went wrong
            </h3>

            <p className="text-[#94A3B8] mb-6">
              The strategy builder encountered an error. Your work has been
              auto-saved. Try refreshing the page to continue.
            </p>

            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm text-[#64748B] cursor-pointer hover:text-[#94A3B8]">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-[#0F0A1A] rounded-lg text-xs text-[#EF4444] overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 text-[#94A3B8] hover:text-white border border-[rgba(79,70,229,0.3)] rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#6366F1] transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Smaller error boundary for individual components/panels
 */
export class PanelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Panel error:", error);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg">
          <p className="text-sm text-[#EF4444] mb-2">
            This panel encountered an error.
          </p>
          <button
            onClick={this.handleRetry}
            className="text-xs text-[#94A3B8] hover:text-white underline"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
