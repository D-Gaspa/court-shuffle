/**
 * LocalStorage persistence layer for Court Shuffle.
 * All app state is saved/loaded here.
 */

import { validateStateShape } from "./storage-validation.js"

const STORAGE_KEY = "court-shuffle-data"
const STORAGE_SCHEMA_VERSION = 2
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

function createStatus({ ok, code, message, error = null, source }) {
    return { ok, code, message, error, source }
}

function getStorageOrThrow(storage = globalThis.localStorage) {
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
        throw new Error("Browser storage is unavailable.")
    }
    return storage
}

function validateStateOrThrow(rawState) {
    return validateStateShape(rawState)
}

function wrapValidationError(prefix, error) {
    const suffix = error instanceof Error && error.message ? ` ${error.message}` : ""
    return new Error(`${prefix}${suffix}`)
}

function loadStateFromStorage(storage = globalThis.localStorage) {
    try {
        const resolvedStorage = getStorageOrThrow(storage)
        const raw = resolvedStorage.getItem(STORAGE_KEY)
        if (!raw) {
            return {
                state: createDefaultState(),
                status: createStatus({
                    ok: true,
                    code: "empty",
                    message: "",
                    source: "load",
                }),
            }
        }

        const parsed = JSON.parse(raw)
        const state = validateStateOrThrow(parsed)
        return {
            state,
            status: createStatus({
                ok: true,
                code: "loaded",
                message: "",
                source: "load",
            }),
        }
    } catch (error) {
        const message =
            error instanceof SyntaxError
                ? "Stored browser data is corrupted. Court Shuffle started with a fresh local state."
                : "Stored browser data is unavailable or invalid. Court Shuffle started with a fresh local state."
        return {
            state: createDefaultState(),
            status: createStatus({
                ok: false,
                code: "load_failed",
                message,
                error,
                source: "load",
            }),
        }
    }
}

function saveStateToStorage(state, storage = globalThis.localStorage) {
    try {
        const resolvedStorage = getStorageOrThrow(storage)
        const normalizedState = validateStateOrThrow(state)
        resolvedStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedState))
        return createStatus({
            ok: true,
            code: "saved",
            message: "",
            source: "save",
        })
    } catch (error) {
        return createStatus({
            ok: false,
            code: "save_failed",
            message: "Browser storage could not be updated. Changes in this tab may be lost.",
            error,
            source: "save",
        })
    }
}

function createStateExport(state) {
    let data
    try {
        data = validateStateOrThrow(state)
    } catch (error) {
        throw wrapValidationError("Cannot export invalid Court Shuffle data.", error)
    }

    return {
        app: STORAGE_EXPORT_APP,
        schemaVersion: STORAGE_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        data,
    }
}

function parseStateImport(rawText) {
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

    try {
        if (exportData) {
            if (exportData.schemaVersion > STORAGE_SCHEMA_VERSION) {
                throw new Error("Backup file was created by a newer version of Court Shuffle.")
            }
            return {
                exportedAt: typeof exportData.exportedAt === "string" ? exportData.exportedAt : null,
                state: validateStateOrThrow(exportData.data),
            }
        }

        if (parsed && typeof parsed === "object") {
            return {
                exportedAt: null,
                state: validateStateOrThrow(parsed),
            }
        }
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "Backup file was created by a newer version of Court Shuffle."
        ) {
            throw error
        }
        throw new Error(`Backup file contains invalid data. ${error.message || "Please export a new backup."}`, {
            cause: error,
        })
    }

    throw new Error("Backup file does not contain Court Shuffle data.")
}

function clearAllData(storage = globalThis.localStorage) {
    getStorageOrThrow(storage).removeItem(STORAGE_KEY)
}

export { clearAllData, createStateExport, loadStateFromStorage, parseStateImport, saveStateToStorage }
export const loadState = loadStateFromStorage
export const saveState = saveStateToStorage
