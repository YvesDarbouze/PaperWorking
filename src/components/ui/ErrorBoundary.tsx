import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  className?: string;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary caught an error in ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={`flex flex-col items-center justify-center p-6 text-center bg-red-50/50 border border-red-100 rounded-xl ${this.props.className || ''}`}>
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Something went wrong</h3>
          <p className="text-sm text-text-secondary max-w-md mb-6">
            An unexpected error occurred in the {this.props.name || 'interface'}. Our systems have logged the issue.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center px-4 py-2 bg-bg-surface border border-border-accent rounded-lg text-sm font-medium text-text-primary hover:bg-bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
            aria-label="Try loading again"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
