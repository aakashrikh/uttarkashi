import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-red-50 text-red-900 border border-red-200 m-4 rounded-lg">
                    <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
                    <p className="font-mono text-sm bg-white p-4 rounded border border-red-100 overflow-auto">
                        {this.state.error && this.state.error.toString()}
                    </p>
                    <details className="mt-4">
                        <summary className="cursor-pointer font-medium mb-2">Stack Trace</summary>
                        <pre className="text-xs overflow-auto bg-gray-900 text-gray-100 p-4 rounded">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
