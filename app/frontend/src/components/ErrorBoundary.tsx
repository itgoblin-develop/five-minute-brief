import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-5xl mb-4">😵</p>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              문제가 발생했습니다
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              일시적인 오류가 발생했어요. 다시 시도해주세요.
            </p>
            <button
              onClick={this.handleReset}
              className="px-6 py-3 bg-[#3D61F1] text-white font-bold rounded-2xl hover:bg-blue-600 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
