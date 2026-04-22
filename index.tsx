
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface Props { 
    children?: ReactNode; 
}
interface State { 
    hasError: boolean; 
    error: Error | null; 
}

// FIX: Explicitly extending React.Component and declaring properties ensures that the TypeScript compiler identifies 'props' and 'state' correctly, resolving common environment-specific inheritance issues.
class ErrorBoundary extends React.Component<Props, State> {
    // Explicitly declare state and props to resolve "Property does not exist on type 'ErrorBoundary'" errors.
    public state: State;
    public props: Props;

    // FIX: Initializing state in the constructor and passing props to super() provides the most reliable type resolution for inherited members in TypeScript class components.
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
        this.props = props;
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("Uncaught error:", error, info);
    }

    render() {
        // FIX: Accessing this.state is now correctly resolved through explicit declaration and standard inheritance.
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-6 text-center">
                    <h1 className="text-2xl font-bold text-red-800 mb-4">Lỗi Hệ Thống APPBCTH</h1>
                    <div className="bg-white p-4 rounded border text-left text-xs font-mono max-w-xl overflow-auto mb-4">
                        {this.state.error?.toString()}
                    </div>
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700">
                        <i className="fa-solid fa-rotate-right mr-2"></i> Tải lại trang
                    </button>
                </div>
            );
        }
        
        // FIX: this.props.children is now correctly recognized as a member of ErrorBoundary.
        return this.props.children || null;
    }
}

const rootEl = document.getElementById('root');
if (rootEl) {
    const root = ReactDOM.createRoot(rootEl);
    root.render(
        <React.StrictMode>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </React.StrictMode>
    );
}
