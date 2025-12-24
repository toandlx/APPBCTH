
import type { SavedSession, TrainingUnit, SessionSummary } from '../types';

const API_URL = '/api/sessions';
const UNIT_API_URL = '/api/training-units';
const SESSION_STORAGE_KEY = 'appbcth_sessions';
const UNIT_STORAGE_KEY = 'appbcth_units';

console.log("[Storage] v4.0.0 - Production Mode Initialized");

const tryApi = async <T>(apiCall: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> => {
    try {
        const result = await apiCall();
        return result;
    } catch (e) {
        console.warn("[Storage] Network/Database issue, using fallback:", (e as Error).message);
        return await fallback();
    }
};

export const storageService = {
    getSessionSummaries: async (): Promise<SessionSummary[]> => {
        return tryApi(
            async () => {
                const res = await fetch(`${API_URL}/summary`);
                if (!res.ok) throw new Error("API Error");
                return await res.json();
            },
            () => {
                const local = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]');
                return local.map((s: SavedSession) => ({
                    id: s.id,
                    name: s.name,
                    reportDate: s.reportDate,
                    createdAt: s.createdAt,
                    grandTotal: s.grandTotal,
                    studentCount: s.studentRecords.length
                }));
            }
        );
    },

    getAllSessions: async (): Promise<SavedSession[]> => {
        return tryApi(
            async () => {
                const res = await fetch(API_URL);
                if (!res.ok) throw new Error("API Error");
                return await res.json();
            },
            () => JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]')
        );
    },

    saveSession: async (session: SavedSession): Promise<void> => {
        // 1. Always Save Local for safety
        const local = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]');
        const idx = local.findIndex((s: any) => s.id === session.id);
        if (idx >= 0) local[idx] = session; else local.unshift(session);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(local));

        // 2. Try Cloud
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(session)
            });
            if (!res.ok) console.warn("[Storage] Session saved locally only.");
        } catch (e) {
            console.error("[Storage] Cloud save error:", e);
        }
    },

    getSessionById: async (id: string): Promise<SavedSession | undefined> => {
        return tryApi(
            async () => {
                const res = await fetch(`${API_URL}/${id}`);
                if (!res.ok) throw new Error("API Error");
                return await res.json();
            },
            () => {
                const local = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]');
                return local.find((s: any) => s.id === id);
            }
        );
    },

    deleteSession: async (id: string): Promise<void> => {
        const local = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]');
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(local.filter((s: any) => s.id !== id)));
        try { await fetch(`${API_URL}/${id}`, { method: 'DELETE' }); } catch (e) {}
    },

    getAllTrainingUnits: async (): Promise<TrainingUnit[]> => {
        return tryApi(
            async () => {
                const res = await fetch(UNIT_API_URL);
                if (!res.ok) throw new Error("API Error");
                return await res.json();
            },
            () => JSON.parse(localStorage.getItem(UNIT_STORAGE_KEY) || '[]')
        );
    },

    saveTrainingUnit: async (unit: TrainingUnit): Promise<void> => {
        const local = JSON.parse(localStorage.getItem(UNIT_STORAGE_KEY) || '[]');
        const idx = local.findIndex((u: any) => u.id === unit.id);
        if (idx >= 0) local[idx] = unit; else local.push(unit);
        localStorage.setItem(UNIT_STORAGE_KEY, JSON.stringify(local));
        try {
            await fetch(UNIT_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(unit)
            });
        } catch (e) {}
    },

    // Fix: Add deleteTrainingUnit to handle individual unit deletion
    deleteTrainingUnit: async (id: string): Promise<void> => {
        const local = JSON.parse(localStorage.getItem(UNIT_STORAGE_KEY) || '[]');
        localStorage.setItem(UNIT_STORAGE_KEY, JSON.stringify(local.filter((u: any) => u.id !== id)));
        try {
            await fetch(`${UNIT_API_URL}/${id}`, { method: 'DELETE' });
        } catch (e) {
            console.error("[Storage] Failed to delete training unit from cloud:", e);
        }
    },

    // Fix: Add importTrainingUnits to handle bulk import from Excel
    importTrainingUnits: async (units: TrainingUnit[]): Promise<void> => {
        const local = JSON.parse(localStorage.getItem(UNIT_STORAGE_KEY) || '[]');
        const updatedLocal = [...local];
        for (const unit of units) {
            const idx = updatedLocal.findIndex((u: any) => u.id === unit.id);
            if (idx >= 0) updatedLocal[idx] = unit; else updatedLocal.push(unit);
        }
        localStorage.setItem(UNIT_STORAGE_KEY, JSON.stringify(updatedLocal));

        for (const unit of units) {
            try {
                await fetch(UNIT_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(unit)
                });
            } catch (e) {
                console.error("[Storage] Failed to sync imported unit to cloud:", unit.code);
            }
        }
    },

    syncLocalToCloud: async (): Promise<{ success: number; failed: number }> => {
        const local = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]');
        let success = 0;
        let failed = 0;
        for (const session of local) {
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(session)
                });
                if (res.ok) success++; else failed++;
            } catch (e) { failed++; }
        }
        return { success, failed };
    },

    clearLocalCache: () => localStorage.removeItem(SESSION_STORAGE_KEY),
    getLocalSessionCount: () => {
        try { return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]').length; } catch { return 0; }
    }
};
