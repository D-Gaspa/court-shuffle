/**
 * LocalStorage persistence layer for Court Shuffle.
 * All app state is saved/loaded here.
 */

const STORAGE_KEY = "court-shuffle-data"
const STORAGE_SCHEMA_VERSION = 1
const STORAGE_EXPORT_APP = "court-shuffle"

function createDefaultState() {
    return {
        roster: [],
        activeSession: null,
        history: [],
        archivedHistory: [],
        lastExportedAt: null,
    }
}

function normalizeState(rawState) {
    const parsed = rawState && typeof rawState === "object" ? rawState : {}
    return {
        roster: Array.isArray(parsed.roster) ? parsed.roster : [],
        activeSession: parsed.activeSession ?? null,
        history: Array.isArray(parsed.history) ? parsed.history : [],
        archivedHistory: Array.isArray(parsed.archivedHistory) ? parsed.archivedHistory : [],
        lastExportedAt: typeof parsed.lastExportedAt === "string" ? parsed.lastExportedAt : null,
    }
}

export function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) {
            return createDefaultState()
        }
        return normalizeState(JSON.parse(raw))
    } catch {
        return createDefaultState()
    }
}

export function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)))
    } catch {
        /* Storage full or unavailable — silent fail */
    }
}

export function createStateExport(state) {
    return {
        app: STORAGE_EXPORT_APP,
        schemaVersion: STORAGE_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        data: normalizeState(state),
    }
}

export function parseStateImport(rawText) {
    let parsed
    try {
        parsed = JSON.parse(rawText)
    } catch (error) {
        throw new Error("Backup file is not valid JSON.", { cause: error })
    }

    const exportData =
        parsed &&
        typeof parsed === "object" &&
        parsed.app === STORAGE_EXPORT_APP &&
        typeof parsed.schemaVersion === "number" &&
        "data" in parsed
            ? parsed
            : null

    if (exportData) {
        if (exportData.schemaVersion > STORAGE_SCHEMA_VERSION) {
            throw new Error("Backup file was created by a newer version of Court Shuffle.")
        }
        return {
            exportedAt: typeof exportData.exportedAt === "string" ? exportData.exportedAt : null,
            state: normalizeState(exportData.data),
        }
    }

    if (parsed && typeof parsed === "object") {
        return {
            exportedAt: null,
            state: normalizeState(parsed),
        }
    }

    throw new Error("Backup file does not contain Court Shuffle data.")
}

export function clearAllData() {
    localStorage.removeItem(STORAGE_KEY)
}
