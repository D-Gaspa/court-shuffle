import { createHistoryActions } from "../features/history/list/actions.js"
import { createHistoryBackupController } from "../features/history/list/backup.js"
import { renderHistory } from "../features/history/list/render.js"
import { createSessionSummaryDialogController } from "../features/history/summary/dialog.js"
import { resolveSessionSummary } from "../features/history/summary/index.js"
import { createRatingsAppController } from "../features/insights/ratings/app-controller.js"
import { createRatingSeasonController } from "../features/insights/ratings/season-controller.js"
import { renderStats } from "../features/insights/stats/index.js"
import { initRoster, refreshRoster } from "../features/roster/controller.js"
import { initSession, launchHistoryRemix, refreshSessionView } from "../features/session/index.js"
import { syncProvisionalHistory } from "../features/session/live/history.js"
import { loadState, saveState } from "../platform/storage/index.js"
import { createConfirmDialogController } from "../ui/confirm-dialog/controller.js"
import { getAppDom } from "./dom.js"
import { createAppRefreshController } from "./refresh-controller.js"
import { createAppStatusController } from "./status/controller.js"

const { state, status: initialLoadStatus } = loadState()
state.roster.sort((a, b) => a.localeCompare(b))

const dom = getAppDom()

const confirmDialogController = createConfirmDialogController({
    dialog: dom.confirmDialog.dialog,
    title: dom.confirmDialog.title,
    message: dom.confirmDialog.message,
    cancelButton: dom.confirmDialog.cancelButton,
    extraButton: dom.confirmDialog.extraButton,
    okButton: dom.confirmDialog.okButton,
})
const appStatus = createAppStatusController({
    banner: dom.appStatus.banner,
    dismissButton: dom.appStatus.dismissButton,
    initialStatus: initialLoadStatus?.ok ? null : initialLoadStatus,
    message: dom.appStatus.message,
})
const sessionSummaryDialogController = createSessionSummaryDialogController({
    appStatus,
    elements: dom.sessionSummaryDialog,
})

function sortRoster() {
    state.roster.sort((a, b) => a.localeCompare(b))
}

function showConfirmDialog(title, message, onOk, options = {}) {
    confirmDialogController.show(title, message, onOk, options)
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

let refreshController = null

const historyBackupController = createHistoryBackupController({
    state,
    sortRoster,
    switchView: (viewName) => refreshController.switchView(viewName, { refreshRoster, refreshSessionView }),
    showConfirmDialog,
    persist,
    refreshAll: () => {
        refreshRoster()
        refreshSessionView()
        refreshController.refreshHistory()
        refreshController.refreshStats()
        refreshRatings()
    },
    elements: {
        exportButton: dom.history.exportButton,
        importButton: dom.history.importButton,
        clearButton: dom.history.clearButton,
        importInput: dom.history.importInput,
        summary: dom.history.backupSummary,
        status: dom.history.backupStatus,
    },
})
const historyActions = createHistoryActions({
    onStatus: (status) => appStatus.set(status),
    state,
    switchView: (viewName) => refreshController.switchView(viewName, { refreshRoster, refreshSessionView }),
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
    refreshHistory: () => refreshController.refreshHistory(),
    launchHistoryRemix,
})
const ratingsAppController = createRatingsAppController({
    onArchiveCurrentSeason: (...args) => ratingSeasonController.handleArchiveCurrentSeason(...args),
    onStartRatingSeason: (...args) => ratingSeasonController.handleStartRatingSeason(...args),
    persist,
    ratingsRoot: dom.ratings.root,
    showConfirmDialog,
    state,
})
const { refreshRatings } = ratingsAppController
const ratingSeasonController = createRatingSeasonController({
    state,
    persist,
    refreshStats: () => refreshController.refreshStats(),
    refreshRatings: () => ratingsAppController.refreshRatings(),
    showConfirmDialog,
    elements: dom.ratings.seasonDialog,
})

refreshController = createAppRefreshController({
    historyActions,
    historyBackupController,
    historyElements: dom.history,
    renderHistory,
    renderStats,
    refreshRatings,
    state,
    statsRoot: dom.stats.root,
    tabs: dom.tabs,
    views: dom.views,
})

function setupTabs() {
    for (const tab of dom.tabs) {
        tab.addEventListener("click", () =>
            refreshController.switchView(tab.dataset.view, { refreshRoster, refreshSessionView }),
        )
    }
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
        refreshController.switchView("session", { refreshRoster, refreshSessionView })
    }
}

init()

export { showConfirmDialog }
