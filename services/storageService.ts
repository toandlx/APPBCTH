
import type { SavedSession, TrainingUnit } from '../types';

const API_URL = '/api/sessions';
const UNIT_API_URL = '/api/training-units';
const SESSION_STORAGE_KEY = 'driving_test_sessions';
const UNIT_STORAGE_KEY = 'driving_test_units';

console.log("[Storage] v3.6.0 - Enhanced Error Handling");

const tryApiOrFallback = async <T>(
    apiCall: () => Promise<T>, 
    fallbackCall: () => T | Promise<T>
): Promise<T> => {
    try {
        return await apiCall();
    } catch (e) {
        console.warn("[Storage] API Error, falling back to local:", e);
        return await fallbackCall();
    }
};

export const storageService = {
    getAllSessions: async (): Promise<SavedSession[]> => {
        return tryApiOrFallback(
            async () => {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error(`API error: ${response.status}`);
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
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API Save failed: ${response.status} - ${errorText}`);
                }
            },
            () => {
                try {
                    const sessions = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]');
                    const index = sessions.findIndex((s: SavedSession) => s.id === session.id);
                    if (index >= 0) sessions[index] = session;
                    else sessions.unshift(session);
                    
                    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
                } catch (e) {
                    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                        throw new Error("Bộ nhớ trình duyệt đã đầy! Vui lòng xóa các kỳ sát hạch cũ hoặc kết nối Cloud SQL.");
                    }
                    throw e;
                }
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

    getAllTrainingUnits: async (): Promise<TrainingUnit[]> => {
        return tryApiOrFallback(
            async () => {
                const response = await fetch(UNIT_API_URL);
                if (!response.ok) throw new Error(`Status ${response.status}`);
                return await response.json();
            },
            () => {
                try {
                    return JSON.parse(localStorage.getItem(UNIT_STORAGE_KEY) || '[]');
                } catch { return []; }
            }
        );
    },

    saveTrainingUnit: async (unit: TrainingUnit): Promise<void> => {
        return tryApiOrFallback(
            async () => {
                const response = await fetch(UNIT_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(unit),
                });
                if (!response.ok) throw new Error(`Save unit failed: ${response.status}`);
            },
            () => {
                const units = JSON.parse(localStorage.getItem(UNIT_STORAGE_KEY) || '[]');
                const index = units.findIndex((u: TrainingUnit) => u.id === unit.id);
                if (index >= 0) units[index] = unit;
                else units.push(unit);
                localStorage.setItem(UNIT_STORAGE_KEY, JSON.stringify(units));
            }
        );
    },

    // Fix: Added missing importTrainingUnits method to handle bulk import of training units
    importTrainingUnits: async (units: TrainingUnit[]): Promise<void> => {
        for (const unit of units) {
            await storageService.saveTrainingUnit(unit);
        }
    },

    deleteTrainingUnit: async (id: string): Promise<void> => {
        return tryApiOrFallback(
            async () => {
                const response = await fetch(`${UNIT_API_URL}/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Delete unit failed');
            },
            () => {
                const units = JSON.parse(localStorage.getItem(UNIT_STORAGE_KEY) || '[]');
                const newUnits = units.filter((u: TrainingUnit) => u.id !== id);
                localStorage.setItem(UNIT_STORAGE_KEY, JSON.stringify(newUnits));
            }
        );
    },

    clearLocalCache: (): void => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
    },

    getLocalSessionCount: (): number => {
        try {
            const sessions = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]');
            return Array.isArray(sessions) ? sessions.length : 0;
        } catch { return 0; }
    },

    syncLocalToCloud: async (): Promise<{ success: number; failed: number; total: number }> => {
        let sessions: SavedSession[] = [];
        try {
            sessions = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]');
        } catch { return { success: 0, failed: 0, total: 0 }; }

        if (!Array.isArray(sessions) || sessions.length === 0) {
            return { success: 0, failed: 0, total: 0 };
        }

        let success = 0;
        let failed = 0;

        for (const session of sessions) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(session),
                });
                if (response.ok) success++;
                else failed++;
            } catch (e) {
                failed++;
            }
        }
        return { success, failed, total: sessions.length };
    }
};
