import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SettingsErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SettingsErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-8 rounded-2xl bg-error/5 border border-error/20 flex flex-col items-center justify-center text-center space-y-4">
          <span className="material-symbols-outlined text-error text-5xl select-none">error</span>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-pw-black">Settings Interface Error</h3>
            <p className="text-sm text-pw-muted max-w-md mx-auto">
              We encountered a problem rendering this section. This could be due to a lost network connection or resource mapping issue.
            </p>
            {this.state.error && (
              <pre className="text-[10px] text-error font-mono bg-error/10 p-3 rounded-lg overflow-x-auto max-w-full text-left">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="h-10 px-5 rounded-lg bg-pw-primary/20 border border-pw-primary/30 text-pw-primary hover:bg-pw-primary/30 active:scale-95 transition-all text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Reload Interface
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
export default SettingsErrorBoundary;
