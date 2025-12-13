import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- SERVICE WORKER CLEANUP (SAFE MODE) ---
const cleanupServiceWorkers = async () => {
    if (!('serviceWorker' in navigator)) return;

    const performCleanup = async () => {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            if (registrations.length > 0) {
                console.log(`[SW Cleanup] Found ${registrations.length} registrations. Unregistering...`);
                for (const registration of registrations) {
                    try {
                        await registration.unregister();
                        console.log(`[SW Cleanup] Unregistered ${registration.scope}`);
                    } catch (e) {
                        console.warn('[SW Cleanup] Unregister failed:', e);
                    }
                }
            }

            // FORCE RELOAD LOGIC v8
            // Bump version to force reload on clients with old cached code
            const CLEANUP_VERSION = 'sw_cleaned_v8';
            if (!sessionStorage.getItem(CLEANUP_VERSION)) {
                console.log(`[App] Force cleaning ${CLEANUP_VERSION}: Reloading...`);
                sessionStorage.setItem(CLEANUP_VERSION, 'true');
                // Force reload ignoring cache
                window.location.reload();
            } else {
                console.log(`[App] Cleanup ${CLEANUP_VERSION} already performed.`);
            }

        } catch (error) {
            console.warn('[SW Cleanup] Error during cleanup:', error);
        }
    };

    // Strict check: Only run when document is complete or on load event
    if (document.readyState === 'complete') {
        performCleanup();
    } else {
        window.addEventListener('load', performCleanup);
    }
};

// Start cleanup
cleanupServiceWorkers();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);