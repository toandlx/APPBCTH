
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

// FIX: Directly extending 'Component' and using the Props/State generics to ensure that 'this.props' is correctly inherited and recognized by the TypeScript compiler.
class ErrorBoundary extends Component<Props, State> {
    // FIX: Initialize state as a class property for better compatibility with strict TypeScript configurations.
    public state: State = { hasError: false, error: null };

    constructor(props: Props) {
        super(props);
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("Uncaught error:", error, info);
    }

    render() {
        // FIX: Accessing this.state is now safe as it's properly inherited and declared.
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
        
        // FIX: Destructuring children from this.props to ensure property access is correctly typed and explicit for the compiler.
        const { children } = this.props;
        return children;
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
