import { accumulateHistoryStats } from "./analytics-accumulate.js"
import { finalizeStatsModel } from "./analytics-finalize.js"

const STATS_SCOPE_OPTIONS = [
    { key: "all", label: "All-time", sessionCount: null },
    { key: "last-10", label: "Last 10", sessionCount: 10 },
    { key: "last-25", label: "Last 25", sessionCount: 25 },
]

function buildStatsModel(history, options = {}) {
    const scope = resolveHistoryScope(history, options.scopeKey)
    const aggregated = accumulateHistoryStats(scope.sessions)
    return finalizeStatsModel({ ...aggregated, scope: scope.meta })
}

function resolveHistoryScope(history, scopeKey) {
    const allSessions = Array.isArray(history) ? history : []
    const selected = STATS_SCOPE_OPTIONS.find((option) => option.key === scopeKey) || STATS_SCOPE_OPTIONS[0]
    const sessions = typeof selected.sessionCount === "number" ? allSessions.slice(-selected.sessionCount) : allSessions
    return {
        sessions,
        meta: {
            key: selected.key,
            label: selected.label,
            sessionCount: sessions.length,
            totalSessionCount: allSessions.length,
        },
    }
}

export { buildStatsModel, STATS_SCOPE_OPTIONS }
