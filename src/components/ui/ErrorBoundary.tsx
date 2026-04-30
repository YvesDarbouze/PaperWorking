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
        <div className={`dashboard-context flex flex-col items-center justify-center p-8 text-center bg-white border border-border-accent rounded-[8px] min-h-[200px] ${this.props.className || ''}`}>
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-5">
            <AlertCircle className="w-6 h-6 text-[#A5A5A5]" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#595959] mb-2">
            Data currently unavailable
          </h3>
          <p className="text-xs text-[#7F7F7F] max-w-sm mb-6 leading-relaxed font-medium">
            The {this.props.name || 'interface segment'} encountered an institutional sync error. 
            The rest of your dashboard remains operational.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center px-6 py-2.5 bg-[#595959] text-white text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            aria-label="Retry data sync"
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-2" />
            Retry Sync
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
