import { createStateExport, parseStateImport } from "../core/storage.js"

function buildBackupSummaryMessage(state) {
    const activeSessionLabel = state.activeSession ? "1 active session in progress" : "no active session"
    return `${state.roster.length} roster players, ${state.history.length} saved sessions, ${state.archivedHistory.length} archived sessions, ${activeSessionLabel}. Saved sessions can include continuation phases. Last backup: ${formatBackupTimestamp(
        state.lastExportedAt,
    )}.`
}

function buildClearHistoryMessage(state) {
    const savedSessions = state.history.length
    const archivedSessions = state.archivedHistory.length
    const activeSessionNote = state.activeSession
        ? "Your current in-progress session will stay in place."
        : "This only affects saved and archived history in this browser."

    return `Clear ${formatSessionCount(savedSessions, "saved")} and ${formatSessionCount(archivedSessions, "archived")}? ${activeSessionNote} This cannot be undone unless you export or import a backup.`
}

function formatBackupTimestamp(isoString) {
    if (!isoString) {
        return "not yet exported"
    }

    const date = new Date(isoString)
    if (Number.isNaN(date.getTime())) {
        return "recently updated"
    }

    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    })
}

function setStatus(statusElement, message, tone = "success") {
    statusElement.textContent = message
    statusElement.classList.toggle("is-error", tone === "error")
}

function refreshSummary({ clearButton, state, statusElement, summaryElement }) {
    const totalSavedSessions = state.history.length + state.archivedHistory.length
    summaryElement.textContent = buildBackupSummaryMessage(state)
    if (clearButton) {
        clearButton.disabled = totalSavedSessions === 0
    }

    if (!statusElement.textContent) {
        setStatus(
            statusElement,
            "Export a backup before clearing browser data or moving to another browser. Continuation phases are preserved inside saved sessions.",
        )
    }
    if (totalSavedSessions === 0 && !state.activeSession && state.roster.length === 0) {
        setStatus(statusElement, "Import an existing backup to restore your Court Shuffle data.")
    }
}

function formatSessionCount(count, label) {
    return `${count} ${label} ${count === 1 ? "session" : "sessions"}`
}

function assignImportedState(state, sortRoster, nextState, exportedAt = null) {
    state.roster = [...nextState.roster]
    state.activeSession = nextState.activeSession
    state.history = [...nextState.history]
    state.archivedHistory = [...nextState.archivedHistory]
    state.lastExportedAt = exportedAt
    sortRoster()
}

function clearHistoryCollections(state) {
    state.history = []
    state.archivedHistory = []
}

function downloadBackup({ persist, state, statusElement, summaryElement }) {
    const backup = createStateExport(state)
    const payload = JSON.stringify(backup, null, 2)
    const blob = new Blob([payload], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const dateStamp = backup.exportedAt.slice(0, 10)

    link.href = url
    link.download = `court-shuffle-backup-${dateStamp}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    state.lastExportedAt = backup.exportedAt
    const persistResult = persist()
    refreshSummary({ state, statusElement, summaryElement })
    setStatus(
        statusElement,
        persistResult.ok
            ? "Backup exported. Keep the JSON file somewhere you control; saved continuation phases are included."
            : "Backup exported, but the local backup timestamp could not be saved in this browser.",
        persistResult.ok ? "success" : "error",
    )
}

async function importBackup({ file, persist, refreshAll, sortRoster, state, statusElement, switchView }) {
    const rawText = await file.text()
    const importedBackup = parseStateImport(rawText)

    assignImportedState(state, sortRoster, importedBackup.state, importedBackup.exportedAt)
    const persistResult = persist()
    refreshAll()
    setStatus(
        statusElement,
        persistResult.ok
            ? "Backup imported. Local data, including saved continuation phases, has been restored."
            : "Backup loaded, but browser storage could not be updated. Keep this tab open until the storage issue is fixed.",
        persistResult.ok ? "success" : "error",
    )

    if (state.activeSession) {
        switchView("session")
        return
    }

    switchView("history")
}

function clearHistory({ persist, refreshAll, state, statusElement, switchView }) {
    clearHistoryCollections(state)
    const persistResult = persist()
    refreshAll()
    setStatus(
        statusElement,
        persistResult.ok
            ? "Saved and archived history cleared. Import a backup to restore a different timeline."
            : "History was cleared in this tab, but browser storage could not be updated. Keep this tab open until the storage issue is fixed.",
        persistResult.ok ? "success" : "error",
    )
    switchView(state.activeSession ? "session" : "history")
}

function getImportMessage(state) {
    const hasExistingData =
        state.roster.length > 0 ||
        state.history.length > 0 ||
        state.archivedHistory.length > 0 ||
        Boolean(state.activeSession)

    return hasExistingData
        ? "Importing a backup will replace the data currently stored in this browser. Continue?"
        : "Import this backup into the current browser?"
}

function bindImportAction({ importInput, showConfirmDialog, ...controller }) {
    importInput.addEventListener("change", () => {
        const [file] = importInput.files || []
        importInput.value = ""
        if (!file) {
            return
        }

        showConfirmDialog("Import Backup", getImportMessage(controller.state), () => {
            importBackup({ ...controller, file }).catch((error) => {
                setStatus(controller.statusElement, error.message || "Backup import failed.", "error")
            })
        })
    })
}

function setupActions({ elements, showConfirmDialog, ...controller }) {
    const { clearButton, exportButton, importButton, importInput } = elements

    exportButton.addEventListener("click", () => {
        downloadBackup(controller)
    })

    importButton.addEventListener("click", () => {
        importInput.click()
    })

    clearButton.addEventListener("click", () => {
        showConfirmDialog("Clear History", buildClearHistoryMessage(controller.state), () => clearHistory(controller), {
            okLabel: "Clear History",
            okClass: "btn-danger",
            extraLabel: "Export First",
            extraClass: "btn-ghost",
            onExtra: () => {
                downloadBackup(controller)
            },
        })
    })

    bindImportAction({
        ...controller,
        importInput,
        showConfirmDialog,
    })
}

function createHistoryBackupController({
    elements,
    persist,
    refreshAll,
    showConfirmDialog,
    sortRoster,
    state,
    switchView,
}) {
    const controller = {
        clearButton: elements.clearButton,
        persist,
        refreshAll,
        sortRoster,
        state,
        statusElement: elements.status,
        summaryElement: elements.summary,
        switchView,
    }

    return {
        refreshSummary: () => {
            refreshSummary(controller)
        },
        setupActions: () => {
            setupActions({ ...controller, elements, showConfirmDialog })
        },
    }
}

export { buildBackupSummaryMessage, buildClearHistoryMessage, clearHistoryCollections, createHistoryBackupController }
