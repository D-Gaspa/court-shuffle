import { createDefaultAnalyticsQuery, resolveAnalyticsContext, updateAnalyticsQuery } from "./analytics/query.js"
import { createAppStatusController } from "./app-status.js"
import { loadState, saveState } from "./core/storage.js"
import { createHistoryActions } from "./history/actions.js"
import { createHistoryBackupController } from "./history/backup.js"
import { renderHistory } from "./history/render.js"
import { createRatingsAppController } from "./ratings/app-controller.js"
import { createRatingSeasonController } from "./ratings/controller.js"
import { initRoster, refreshRoster } from "./roster/controller.js"
import { initSession, launchHistoryRemix, refreshSessionView } from "./session/index.js"
import { renderStats } from "./stats/render.js"

const { state, status: initialLoadStatus } = loadState()
state.roster.sort((a, b) => a.localeCompare(b))

const tabs = document.querySelectorAll(".tab")
const views = {
    roster: document.getElementById("view-roster"),
    session: document.getElementById("view-session"),
    stats: document.getElementById("view-stats"),
    ratings: document.getElementById("view-ratings"),
    history: document.getElementById("view-history"),
}

const appStatusBanner = document.getElementById("app-status-banner")
const appStatusMessage = document.getElementById("app-status-message")
const appStatusDismissBtn = document.getElementById("app-status-dismiss")
const historyList = document.getElementById("history-list")
const historyEmpty = document.getElementById("history-empty")
const historyExportBtn = document.getElementById("history-export-btn")
const historyImportBtn = document.getElementById("history-import-btn")
const historyImportInput = document.getElementById("history-import-input")
const historyBackupSummary = document.getElementById("history-backup-summary")
const historyBackupStatus = document.getElementById("history-backup-status")
const statsRoot = document.getElementById("stats-root")
const ratingsRoot = document.getElementById("ratings-root")

const confirmDialog = document.getElementById("confirm-dialog")
const confirmTitle = document.getElementById("confirm-title")
const confirmMessage = document.getElementById("confirm-message")
const confirmCancelBtn = document.getElementById("confirm-cancel")
const confirmExtraBtn = document.getElementById("confirm-extra")
const confirmOkBtn = document.getElementById("confirm-ok")
const seasonLabelDialog = document.getElementById("season-label-dialog")
const seasonLabelTitle = document.getElementById("season-label-title")
const seasonLabelMessage = document.getElementById("season-label-message")
const seasonLabelInput = document.getElementById("season-label-input")
const seasonStartDateInput = document.getElementById("season-start-date-input")
const seasonStartDateHint = document.getElementById("season-start-date-hint")
const seasonOldestDateBtn = document.getElementById("season-oldest-date-btn")
const seasonLabelError = document.getElementById("season-label-error")
const seasonLabelCancelBtn = document.getElementById("season-label-cancel")
const seasonLabelConfirmBtn = document.getElementById("season-label-confirm")

let confirmCallback = null
let confirmExtraCallback = null
let analyticsQuery = createDefaultAnalyticsQuery()
let historyPlayerFilter = "all"
const appStatus = createAppStatusController({
    banner: appStatusBanner,
    dismissButton: appStatusDismissBtn,
    initialStatus: initialLoadStatus?.ok ? null : initialLoadStatus,
    message: appStatusMessage,
})
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
        refreshRatings()
    },
    elements: {
        exportButton: historyExportBtn,
        importButton: historyImportBtn,
        importInput: historyImportInput,
        summary: historyBackupSummary,
        status: historyBackupStatus,
    },
})
const historyActions = createHistoryActions({
    state,
    switchView,
    showConfirmDialog,
    persist,
    refreshHistory,
    launchHistoryRemix,
})
const ratingSeasonController = createRatingSeasonController({
    state,
    persist,
    refreshStats,
    refreshRatings: () => ratingsAppController.refreshRatings(),
    showConfirmDialog,
    elements: {
        dialog: seasonLabelDialog,
        title: seasonLabelTitle,
        message: seasonLabelMessage,
        input: seasonLabelInput,
        dateInput: seasonStartDateInput,
        dateHint: seasonStartDateHint,
        oldestDateButton: seasonOldestDateBtn,
        error: seasonLabelError,
        cancelButton: seasonLabelCancelBtn,
        confirmButton: seasonLabelConfirmBtn,
    },
})
const ratingsAppController = createRatingsAppController({
    onStartRatingSeason: ratingSeasonController.handleStartRatingSeason,
    persist,
    ratingsRoot,
    showConfirmDialog,
    state,
})
const { refreshRatings } = ratingsAppController

function sortRoster() {
    state.roster.sort((a, b) => a.localeCompare(b))
}

function persist() {
    const result = saveState(state)
    if (result.ok) {
        appStatus.clear("save")
    } else {
        appStatus.set(result)
    }
    return result
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
    } else if (viewName === "ratings") {
        refreshRatings()
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
            active: historyActions.resolveActiveHistoryActions,
            archived: historyActions.resolveArchivedHistoryActions,
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
    refreshRatings()
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
    refreshRatings()
}

function resetSharedAnalyticsQuery() {
    analyticsQuery = createDefaultAnalyticsQuery()
    refreshHistory()
    refreshStats()
    refreshRatings()
}

function resetHistoryQuery() {
    analyticsQuery = createDefaultAnalyticsQuery()
    historyPlayerFilter = "all"
    refreshHistory()
    refreshStats()
    refreshRatings()
}

function init() {
    setupTabs()
    setupConfirmDialog()
    ratingSeasonController.setupDialog()
    appStatus.bind()
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
