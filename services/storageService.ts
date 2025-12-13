import type { SavedSession } from '../types';

const API_URL = '/api/sessions';
const SESSION_STORAGE_KEY = 'driving_test_sessions';

console.log("[Storage] v3.2.2 - Hybrid Mode (Cloud SQL -> LocalStorage)");

// Helper function: Try API first, fallback to LocalStorage if API fails
const tryApiOrFallback = async <T>(
    apiCall: () => Promise<T>, 
    fallbackCall: () => T | Promise<T>
): Promise<T> => {
    try {
        // Attempt API call
        return await apiCall();
    } catch (e) {
        console.warn("[Storage] API unavailable (using LocalStorage fallback):", e);
        return fallbackCall();
    }
};

export const storageService = {
    // --- SESSIONS ---
    getAllSessions: async (): Promise<SavedSession[]> => {
        return tryApiOrFallback(
            async () => {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error(`Status ${response.status}`);
                
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                     throw new Error("Invalid content type (likely HTML 404)");
                }
                return await response.json();
            },
            () => {
                try {
                    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]');
                } catch { return []; }
            }
        );
    },

    saveSession: async (session: SavedSession): Promise<void> => {
        return tryApiOrFallback(
            async () => {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(session),
                });
                if (!response.ok) throw new Error(`Save failed: ${response.status}`);
            },
            () => {
                const sessions = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]');
                const index = sessions.findIndex((s: SavedSession) => s.id === session.id);
                if (index >= 0) sessions[index] = session;
                else sessions.unshift(session);
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
            }
        );
    },

    deleteSession: async (id: string): Promise<void> => {
        return tryApiOrFallback(
            async () => {
                const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Delete failed');
            },
            () => {
                const sessions = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]');
                const newSessions = sessions.filter((s: SavedSession) => s.id !== id);
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSessions));
            }
        );
    },

    getSessionById: async (id: string): Promise<SavedSession | undefined> => {
        return tryApiOrFallback(
            async () => {
                const response = await fetch(`${API_URL}/${id}`);
                if (response.status === 404) return undefined;
                if (!response.ok) throw new Error('Network error');
                return await response.json();
            },
            () => {
                const sessions = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]');
                return sessions.find((s: SavedSession) => s.id === id);
            }
        );
    },
};