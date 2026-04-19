import {
    createDefaultAnalyticsQuery,
    resolveAnalyticsContext,
    updateAnalyticsQuery,
} from "../features/insights/query/state.js"

function createHistoryRefresh({
    getAnalyticsQuery,
    getHistoryPlayerFilter,
    handleHistoryQueryChange,
    historyActions,
    historyBackupController,
    historyElements,
    renderHistory,
    resetHistoryQuery,
    state,
}) {
    return function refreshHistory() {
        const analytics = resolveAnalyticsContext(state.history, {
            ...getAnalyticsQuery(),
            player: getHistoryPlayerFilter(),
        })
        renderHistory({
            history: state.history,
            archivedHistory: state.archivedHistory,
            container: historyElements.list,
            emptyState: historyElements.empty,
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
}

function createStatsRefresh({
    getAnalyticsQuery,
    handleSharedAnalyticsQueryChange,
    renderStats,
    resetSharedAnalyticsQuery,
    state,
    statsRoot,
}) {
    return function refreshStats() {
        const analytics = resolveAnalyticsContext(state.history, getAnalyticsQuery())
        renderStats({
            analytics,
            root: statsRoot,
            onQueryChange: handleSharedAnalyticsQueryChange,
            onResetQuery: resetSharedAnalyticsQuery,
        })
    }
}

function syncActiveView(tabs, viewName, views) {
    for (const tab of tabs) {
        const isActive = tab.dataset.view === viewName
        tab.classList.toggle("active", isActive)
        tab.setAttribute("aria-selected", String(isActive))
    }
    for (const [key, element] of Object.entries(views)) {
        element.classList.toggle("active", key === viewName)
    }
}

function createAnalyticsQueryController(refreshInsights) {
    let analyticsQuery = createDefaultAnalyticsQuery()
    let historyPlayerFilter = "all"

    return {
        getAnalyticsQuery: () => analyticsQuery,
        getHistoryPlayerFilter: () => historyPlayerFilter,
        handleSharedAnalyticsQueryChange(patch) {
            analyticsQuery = updateAnalyticsQuery(analyticsQuery, patch)
            refreshInsights()
        },
        handleHistoryQueryChange(patch) {
            if (Object.hasOwn(patch, "player")) {
                historyPlayerFilter = patch.player || "all"
            }
            const { player: _player, ...sharedPatch } = patch
            if (Object.keys(sharedPatch).length > 0) {
                analyticsQuery = updateAnalyticsQuery(analyticsQuery, sharedPatch)
            }
            refreshInsights()
        },
        resetSharedAnalyticsQuery() {
            analyticsQuery = createDefaultAnalyticsQuery()
            refreshInsights()
        },
        resetHistoryQuery() {
            analyticsQuery = createDefaultAnalyticsQuery()
            historyPlayerFilter = "all"
            refreshInsights()
        },
    }
}

function createAppRefreshController({
    historyActions,
    historyBackupController,
    historyElements,
    renderHistory,
    renderStats,
    refreshRatings,
    state,
    statsRoot,
    tabs,
    views,
}) {
    let refreshHistory = () => undefined
    let refreshStats = () => undefined
    const refreshInsights = () => {
        refreshHistory()
        refreshStats()
        refreshRatings()
    }
    const analyticsController = createAnalyticsQueryController(refreshInsights)

    refreshHistory = createHistoryRefresh({
        getAnalyticsQuery: analyticsController.getAnalyticsQuery,
        getHistoryPlayerFilter: analyticsController.getHistoryPlayerFilter,
        handleHistoryQueryChange: analyticsController.handleHistoryQueryChange,
        historyActions,
        historyBackupController,
        historyElements,
        renderHistory,
        resetHistoryQuery: analyticsController.resetHistoryQuery,
        state,
    })
    refreshStats = createStatsRefresh({
        getAnalyticsQuery: analyticsController.getAnalyticsQuery,
        handleSharedAnalyticsQueryChange: analyticsController.handleSharedAnalyticsQueryChange,
        renderStats,
        resetSharedAnalyticsQuery: analyticsController.resetSharedAnalyticsQuery,
        state,
        statsRoot,
    })

    function switchView(viewName, refreshers) {
        syncActiveView(tabs, viewName, views)

        if (viewName === "roster") {
            refreshers.refreshRoster()
        } else if (viewName === "session") {
            refreshers.refreshSessionView()
        } else if (viewName === "stats") {
            refreshStats()
        } else if (viewName === "ratings") {
            refreshRatings()
        } else if (viewName === "history") {
            refreshHistory()
        }
    }

    return {
        refreshHistory,
        refreshInsights,
        refreshStats,
        switchView,
    }
}

export { createAppRefreshController }
