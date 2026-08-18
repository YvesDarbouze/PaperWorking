'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorId: string | null;
  errorMessage: string | null;
}

/**
 * PaperWorking React Error Boundary
 * 
 * Captures unhandled UI exceptions, logs UUID for support tracking,
 * and presents actionable fallback UI without exposing internal stack traces.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorId: null,
      errorMessage: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Generate UUID reference ID for support tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      hasError: true,
      errorId,
      errorMessage: 'Something went wrong. Our team has been notified.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary ${this.state.errorId}] Unhandled component exception:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: '32px 24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
            Service Temporarily Unavailable
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
            {this.state.errorMessage}
          </p>
          <div
            style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              background: '#f3f4f6',
              padding: '6px 12px',
              borderRadius: '4px',
              display: 'inline-block',
              color: '#4b5563',
            }}
          >
            Support Reference ID: {this.state.errorId}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
