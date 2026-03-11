/**
 * LocalStorage persistence layer for Court Shuffle.
 * All app state is saved/loaded here.
 */

const STORAGE_KEY = "court-shuffle-data"

const DEFAULT_STATE = {
    roster: [],
    activeSession: null,
    history: [],
    archivedHistory: [],
}

export function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) {
            return structuredClone(DEFAULT_STATE)
        }
        const parsed = JSON.parse(raw)
        return {
            roster: Array.isArray(parsed.roster) ? parsed.roster : [],
            activeSession: parsed.activeSession ?? null,
            history: Array.isArray(parsed.history) ? parsed.history : [],
            archivedHistory: Array.isArray(parsed.archivedHistory) ? parsed.archivedHistory : [],
        }
    } catch {
        return structuredClone(DEFAULT_STATE)
    }
}

export function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
        /* Storage full or unavailable — silent fail */
    }
}

export function clearAllData() {
    localStorage.removeItem(STORAGE_KEY)
}
