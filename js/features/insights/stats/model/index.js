import { accumulateHistoryStats } from "./accumulate.js"
import { finalizeStatsModel } from "./finalize.js"

function buildStatsModel(filteredSessions, options = {}) {
    const aggregated = accumulateHistoryStats(filteredSessions)
    return finalizeStatsModel({
        ...aggregated,
        queryMeta: options.queryMeta,
    })
}

export { buildStatsModel }
