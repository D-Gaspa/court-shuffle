import { createDefaultAnalyticsQuery, resolveAnalyticsContext, updateAnalyticsQuery } from "./analytics/query.js"
import { loadState, saveState } from "./core/storage.js"
import { createHistoryBackupController } from "./history/backup.js"
import { renderHistory } from "./history/render.js"
import { initRoster, refreshRoster } from "./roster/controller.js"
import { initSession, refreshSessionView } from "./session/index.js"
import { renderStats } from "./stats/render.js"

const state = loadState()
state.roster.sort((a, b) => a.localeCompare(b))

const tabs = document.querySelectorAll(".tab")
const views = {
    roster: document.getElementById("view-roster"),
    session: document.getElementById("view-session"),
    stats: document.getElementById("view-stats"),
    history: document.getElementById("view-history"),
}

const historyList = document.getElementById("history-list")
const historyEmpty = document.getElementById("history-empty")
const historyExportBtn = document.getElementById("history-export-btn")
const historyImportBtn = document.getElementById("history-import-btn")
const historyImportInput = document.getElementById("history-import-input")
const historyBackupSummary = document.getElementById("history-backup-summary")
const historyBackupStatus = document.getElementById("history-backup-status")
const statsRoot = document.getElementById("stats-root")

const confirmDialog = document.getElementById("confirm-dialog")
const confirmTitle = document.getElementById("confirm-title")
const confirmMessage = document.getElementById("confirm-message")
const confirmCancelBtn = document.getElementById("confirm-cancel")
const confirmExtraBtn = document.getElementById("confirm-extra")
const confirmOkBtn = document.getElementById("confirm-ok")

let confirmCallback = null
let confirmExtraCallback = null
let analyticsQuery = createDefaultAnalyticsQuery()
let historyPlayerFilter = "all"
const historyBackupController = createHistoryBackupController({
    state,
    sortRoster,
    switchView,
    showConfirmDialog,
    persist,
    refreshAll: () => {
        refreshRoster()
        refreshSessionView()
        refreshHistory()
        refreshStats()
    },
    elements: {
        exportButton: historyExportBtn,
        importButton: historyImportBtn,
        importInput: historyImportInput,
        summary: historyBackupSummary,
        status: historyBackupStatus,
    },
})

function sortRoster() {
    state.roster.sort((a, b) => a.localeCompare(b))
}

function persist() {
    saveState(state)
}

function switchView(viewName) {
    for (const tab of tabs) {
        const isActive = tab.dataset.view === viewName
        tab.classList.toggle("active", isActive)
        tab.setAttribute("aria-selected", String(isActive))
    }
    for (const [key, el] of Object.entries(views)) {
        el.classList.toggle("active", key === viewName)
    }

    if (viewName === "roster") {
        refreshRoster()
    } else if (viewName === "session") {
        refreshSessionView()
    } else if (viewName === "stats") {
        refreshStats()
    } else if (viewName === "history") {
        refreshHistory()
    }
}

function setupTabs() {
    for (const tab of tabs) {
        tab.addEventListener("click", () => switchView(tab.dataset.view))
    }
}

function showConfirmDialog(title, message, onOk, options = {}) {
    confirmTitle.textContent = title
    confirmMessage.textContent = message
    confirmCallback = onOk
    confirmOkBtn.textContent = options.okLabel ?? "Confirm"
    confirmOkBtn.className = `btn ${options.okClass ?? "btn-danger"}`
    if (options.extraLabel && options.onExtra) {
        confirmExtraBtn.textContent = options.extraLabel
        confirmExtraCallback = options.onExtra
        confirmExtraBtn.hidden = false
    } else {
        confirmExtraBtn.hidden = true
        confirmExtraCallback = null
    }
    confirmDialog.showModal()
}

function setupConfirmDialog() {
    confirmCancelBtn.addEventListener("click", () => {
        confirmDialog.close()
        confirmCallback = null
        confirmExtraCallback = null
    })

    confirmExtraBtn.addEventListener("click", () => {
        if (confirmExtraCallback) {
            confirmExtraCallback()
        }
        confirmDialog.close()
        confirmCallback = null
        confirmExtraCallback = null
    })

    confirmOkBtn.addEventListener("click", () => {
        if (confirmCallback) {
            confirmCallback()
        }
        confirmDialog.close()
        confirmCallback = null
        confirmExtraCallback = null
    })
}

function refreshHistory() {
    const analytics = resolveAnalyticsContext(state.history, {
        ...analyticsQuery,
        player: historyPlayerFilter,
    })
    renderHistory({
        history: state.history,
        archivedHistory: state.archivedHistory,
        container: historyList,
        emptyState: historyEmpty,
        analytics,
        onQueryChange: handleHistoryQueryChange,
        onResetQuery: resetHistoryQuery,
        actions: {
            active: [
                {
                    label: "Archive Session",
                    className: "btn btn-ghost btn-sm btn-danger",
                    onClick: (session) => {
                        showConfirmDialog("Archive Session", "Move this session into the archive?", () => {
                            state.history = state.history.filter((entry) => entry.id !== session.id)
                            state.archivedHistory.unshift(session)
                            persist()
                            refreshHistory()
                        })
                    },
                },
            ],
            archived: [
                {
                    label: "Restore",
                    className: "btn btn-ghost btn-sm",
                    onClick: (session) => {
                        state.archivedHistory = state.archivedHistory.filter((entry) => entry.id !== session.id)
                        state.history.push(session)
                        persist()
                        refreshHistory()
                    },
                },
                {
                    label: "Delete Permanently",
                    className: "btn btn-ghost btn-sm btn-danger",
                    onClick: (session) => {
                        showConfirmDialog("Delete Permanently", "Remove this archived session for good?", () => {
                            state.archivedHistory = state.archivedHistory.filter((entry) => entry.id !== session.id)
                            persist()
                            refreshHistory()
                        })
                    },
                },
            ],
        },
    })
    historyBackupController.refreshSummary()
}

function refreshStats() {
    const analytics = resolveAnalyticsContext(state.history, analyticsQuery)
    renderStats({
        analytics,
        root: statsRoot,
        onQueryChange: handleSharedAnalyticsQueryChange,
        onResetQuery: resetSharedAnalyticsQuery,
    })
}

function handleSharedAnalyticsQueryChange(patch) {
    analyticsQuery = updateAnalyticsQuery(analyticsQuery, patch)
    refreshHistory()
    refreshStats()
}

function handleHistoryQueryChange(patch) {
    if (Object.hasOwn(patch, "player")) {
        historyPlayerFilter = patch.player || "all"
    }
    const { player: _player, ...sharedPatch } = patch
    if (Object.keys(sharedPatch).length > 0) {
        analyticsQuery = updateAnalyticsQuery(analyticsQuery, sharedPatch)
    }
    refreshHistory()
    refreshStats()
}

function resetSharedAnalyticsQuery() {
    analyticsQuery = createDefaultAnalyticsQuery()
    refreshHistory()
    refreshStats()
}

function resetHistoryQuery() {
    analyticsQuery = createDefaultAnalyticsQuery()
    historyPlayerFilter = "all"
    refreshHistory()
    refreshStats()
}

function init() {
    setupTabs()
    setupConfirmDialog()
    historyBackupController.setupActions()
    initRoster(state, persist, showConfirmDialog)
    initSession(state, persist, showConfirmDialog)

    sortRoster()
    historyBackupController.refreshSummary()
    refreshRoster()
    if (state.activeSession) {
        switchView("session")
    }
}

init()

export { showConfirmDialog }
