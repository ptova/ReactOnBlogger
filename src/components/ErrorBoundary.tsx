import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Catches JavaScript errors anywhere in its child component tree and displays
 * a fallback UI instead of crashing the whole page.
 *
 * This is a class component because React's error boundary API (getDerivedStateFromError
 * and componentDidCatch) requires class lifecycle methods — there is no hook equivalent.
 *
 * Placed at the root of the component tree in App.tsx so it catches errors
 * from any child component, including routing and the post list.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: null };

    /** Static lifecycle: derives new state from a thrown error. */
    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    /** Side-effect lifecycle: logs the error with component stack trace. */
    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('ErrorBoundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen text-white p-8">
                    <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
                    <p className="text-gray-400 mb-4">{this.state.error?.message}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 bg-white text-indigo-600 rounded-md font-medium hover:scale-105 transition-transform"
                    >
                        Reload page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
