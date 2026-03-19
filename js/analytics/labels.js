const TOURNAMENT_FORMAT_LABELS = {
    elimination: "Elimination",
    consolation: "Consolation",
    "round-robin": "Round Robin",
}

function formatTournamentFormatLabel(key) {
    return TOURNAMENT_FORMAT_LABELS[key] || "Tournament"
}

function formatTimePresetLabel(query) {
    if (query.timePreset === "all") {
        return "All time"
    }
    if (query.timePreset === "30d") {
        return "Last 30 days"
    }
    if (query.timePreset === "90d") {
        return "Last 90 days"
    }
    if (query.dateFrom && query.dateTo) {
        return `${query.dateFrom} to ${query.dateTo}`
    }
    if (query.dateFrom) {
        return `From ${query.dateFrom}`
    }
    if (query.dateTo) {
        return `Until ${query.dateTo}`
    }
    return "Custom range"
}

function formatTimePresetShortLabel(query) {
    if (query.timePreset === "all") {
        return "All-time"
    }
    if (query.timePreset === "30d") {
        return "Last 30 days"
    }
    if (query.timePreset === "90d") {
        return "Last 90 days"
    }
    return "Custom range"
}

function getModeFilterLabel(modeKey, options) {
    const option = options.find((entry) => entry.key === modeKey)
    return option?.label || "All Modes"
}

export { formatTimePresetLabel, formatTimePresetShortLabel, formatTournamentFormatLabel, getModeFilterLabel }
