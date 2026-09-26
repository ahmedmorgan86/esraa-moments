import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('Unhandled UI error:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);
    return (
      <div className="min-h-[60vh] section page flex flex-col items-center justify-center text-center gap-4">
        <h1 className="text-3xl font-black">Something went wrong</h1>
        <p className="text-muted text-sm max-w-md">
          The page failed to load. Please try again.
        </p>
        <button type="button" onClick={this.reset} className="btn primary">
          Try again
        </button>
      </div>
    );
  }
}
