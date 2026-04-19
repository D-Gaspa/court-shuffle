import { createHistoryActions } from "../features/history/list/actions.js"
import { createHistoryBackupController } from "../features/history/list/backup.js"
import { renderHistory } from "../features/history/list/render.js"
import { createSessionSummaryDialogController } from "../features/history/summary/dialog.js"
import { resolveSessionSummary } from "../features/history/summary/index.js"
import {
    createDefaultAnalyticsQuery,
    resolveAnalyticsContext,
    updateAnalyticsQuery,
} from "../features/insights/query/state.js"
import { createRatingsAppController } from "../features/insights/ratings/app-controller.js"
import { createRatingSeasonController } from "../features/insights/ratings/season-controller.js"
import { renderStats } from "../features/insights/stats/index.js"
import { initRoster, refreshRoster } from "../features/roster/controller.js"
import { initSession, launchHistoryRemix, refreshSessionView } from "../features/session/index.js"
import { syncProvisionalHistory } from "../features/session/live/history.js"
import { loadState, saveState } from "../platform/storage/index.js"
import { createConfirmDialogController } from "../ui/confirm-dialog/controller.js"
import { createAppStatusController } from "./status/controller.js"

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
const historyClearBtn = document.getElementById("history-clear-btn")
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

let analyticsQuery = createDefaultAnalyticsQuery()
let historyPlayerFilter = "all"
const confirmDialogController = createConfirmDialogController({
    dialog: confirmDialog,
    title: confirmTitle,
    message: confirmMessage,
    cancelButton: confirmCancelBtn,
    extraButton: confirmExtraBtn,
    okButton: confirmOkBtn,
})
const appStatus = createAppStatusController({
    banner: appStatusBanner,
    dismissButton: appStatusDismissBtn,
    initialStatus: initialLoadStatus?.ok ? null : initialLoadStatus,
    message: appStatusMessage,
})
const sessionSummaryDialogController = createSessionSummaryDialogController({
    appStatus,
    elements: {
        dialog: document.getElementById("session-summary-dialog"),
        title: document.getElementById("session-summary-title"),
        subtitle: document.getElementById("session-summary-subtitle"),
        report: document.getElementById("session-summary-report"),
        closeButton: document.getElementById("session-summary-close"),
        exportButton: document.getElementById("session-summary-export"),
    },
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
        clearButton: historyClearBtn,
        importInput: historyImportInput,
        summary: historyBackupSummary,
        status: historyBackupStatus,
    },
})
const historyActions = createHistoryActions({
    onStatus: (status) => appStatus.set(status),
    state,
    switchView,
    showConfirmDialog,
    showSessionSummary(entry) {
        const summary = resolveSessionSummary({
            entry,
            history: state.history,
            archivedHistory: state.archivedHistory,
            ratings: state.ratings,
        })
        if (summary) {
            sessionSummaryDialogController.show(summary)
        }
    },
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
    onArchiveCurrentSeason: ratingSeasonController.handleArchiveCurrentSeason,
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
    syncProvisionalHistory(state)
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
    confirmDialogController.show(title, message, onOk, options)
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
            activeGroup: historyActions.resolveActiveNightGroupActions,
            archived: historyActions.resolveArchivedHistoryActions,
            archivedGroup: historyActions.resolveArchivedNightGroupActions,
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
    confirmDialogController.setup()
    sessionSummaryDialogController.setup()
    ratingSeasonController.setupDialog()
    appStatus.bind()
    historyBackupController.setupActions()
    initRoster(state, persist, showConfirmDialog)
    initSession(state, persist, showConfirmDialog, {
        onSessionSaved: sessionSummaryDialogController.show,
    })

    sortRoster()
    historyBackupController.refreshSummary()
    refreshRoster()
    if (state.activeSession) {
        switchView("session")
    }
}

init()

export { showConfirmDialog }
