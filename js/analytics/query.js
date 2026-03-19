import {
    formatTimePresetLabel,
    formatTimePresetShortLabel,
    formatTournamentFormatLabel,
    getModeFilterLabel,
} from "./labels.js"

const HOURS_PER_DAY = 24
const MINUTES_PER_HOUR = 60
const SECONDS_PER_MINUTE = 60
const MS_PER_SECOND = 1000
const DAY_MS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND
const DEFAULT_DATE_SUFFIX = "T00:00:00"
const END_OF_DAY_HOURS = 23
const END_OF_DAY_MINUTES = 59
const END_OF_DAY_SECONDS = 59
const END_OF_DAY_MS = 999
const DAYS_IN_30D_PRESET = 30
const DAYS_IN_90D_PRESET = 90

const ANALYTICS_TIME_PRESETS = [
    { key: "all", label: "All" },
    { key: "30d", label: "30D" },
    { key: "90d", label: "90D" },
    { key: "custom", label: "Custom" },
]

const ANALYTICS_MODE_OPTIONS = [
    { key: "all", label: "All Modes" },
    { key: "free", label: "Free" },
    { key: "singles", label: "Singles" },
    { key: "doubles", label: "Doubles" },
    { key: "tournament", label: "Tournament" },
]

function createDefaultAnalyticsQuery() {
    return {
        timePreset: ANALYTICS_TIME_PRESETS[0].key,
        dateFrom: "",
        dateTo: "",
        player: "all",
        mode: "all",
        tournamentFormat: "all",
    }
}

function updateAnalyticsQuery(query, patch = {}) {
    const next = {
        ...query,
        ...patch,
    }
    if (patch.timePreset && patch.timePreset !== "custom") {
        next.dateFrom = ""
        next.dateTo = ""
    }
    if (patch.mode && !allowsTournamentFormat(next.mode)) {
        next.tournamentFormat = "all"
    }
    return normalizeAnalyticsQuery(next)
}

function normalizeAnalyticsQuery(query = {}) {
    const normalized = {
        ...createDefaultAnalyticsQuery(),
        ...query,
    }
    if (!allowsTournamentFormat(normalized.mode)) {
        normalized.tournamentFormat = "all"
    }
    return normalized
}

function resolveAnalyticsContext(history, query) {
    const sessions = Array.isArray(history) ? history : []
    const normalizedQuery = normalizeAnalyticsQuery(query)
    const options = buildAnalyticsOptions(sessions, normalizedQuery)
    const filteredSessions = sessions.filter((session) => matchesAnalyticsQuery(session, normalizedQuery))
    return {
        query: normalizedQuery,
        options,
        filteredSessions,
        summary: buildAnalyticsSummary(sessions, filteredSessions, normalizedQuery, options),
    }
}

function buildAnalyticsOptions(sessions, query) {
    const players = new Set()
    const tournamentFormats = new Set()
    let hasTournamentSessions = false
    for (const session of sessions) {
        for (const player of session.players || []) {
            if (player) {
                players.add(player)
            }
        }
        if (session.mode === "tournament") {
            hasTournamentSessions = true
            const format = getTournamentFormatKey(session)
            if (format) {
                tournamentFormats.add(format)
            }
        }
    }
    return {
        playerOptions: [...players].sort((a, b) => a.localeCompare(b)),
        modeOptions: ANALYTICS_MODE_OPTIONS,
        tournamentFormatOptions: [...tournamentFormats]
            .sort((a, b) => formatTournamentFormatLabel(a).localeCompare(formatTournamentFormatLabel(b)))
            .map((key) => ({ key, label: formatTournamentFormatLabel(key) })),
        timeOptions: ANALYTICS_TIME_PRESETS,
        totalPlayerCount: players.size,
        showTournamentFormatFilter: hasTournamentSessions && allowsTournamentFormat(query.mode),
    }
}

function buildAnalyticsSummary(allSessions, filteredSessions, query, options) {
    const filteredPlayers = new Set()
    for (const session of filteredSessions) {
        for (const player of session.players || []) {
            if (player) {
                filteredPlayers.add(player)
            }
        }
    }
    const activeChips = ["Active history only"]
    const timeLabel = formatTimePresetLabel(query)
    if (timeLabel) {
        activeChips.push(timeLabel)
    }
    if (query.player !== "all") {
        activeChips.push(`Player: ${query.player}`)
    }
    if (query.mode !== "all") {
        activeChips.push(`Mode: ${getModeFilterLabel(query.mode, ANALYTICS_MODE_OPTIONS)}`)
    }
    if (query.tournamentFormat !== "all" && allowsTournamentFormat(query.mode)) {
        activeChips.push(`Format: ${formatTournamentFormatLabel(query.tournamentFormat)}`)
    }
    return {
        totalSessionCount: allSessions.length,
        filteredSessionCount: filteredSessions.length,
        totalPlayerCount: options.totalPlayerCount,
        filteredPlayerCount: filteredPlayers.size,
        activeChips,
        resultCountLabel: `${filteredSessions.length}/${allSessions.length} sessions`,
        resultSummary:
            filteredSessions.length === allSessions.length
                ? `${allSessions.length} saved sessions in scope`
                : `${filteredSessions.length} of ${allSessions.length} saved sessions match this query`,
        timeLabel,
        shortTimeLabel: formatTimePresetShortLabel(query),
        showTournamentFormatFilter: options.showTournamentFormatFilter,
    }
}

function matchesAnalyticsQuery(session, query) {
    if (!matchesTimeWindow(session, query)) {
        return false
    }
    if (query.player !== "all" && !(session.players || []).includes(query.player)) {
        return false
    }
    if (!matchesMode(session, query.mode)) {
        return false
    }
    if (query.tournamentFormat !== "all" && getTournamentFormatKey(session) !== query.tournamentFormat) {
        return false
    }
    return true
}

function matchesTimeWindow(session, query) {
    if (query.timePreset === "all") {
        return true
    }
    const sessionDate = parseSessionDate(session.date)
    if (!sessionDate) {
        return false
    }
    if (query.timePreset === "custom") {
        return matchesCustomDateWindow(sessionDate, query)
    }
    const days = resolvePresetDays(query.timePreset)
    const threshold = new Date(Date.now() - days * DAY_MS)
    threshold.setHours(0, 0, 0, 0)
    return sessionDate >= threshold
}

function matchesCustomDateWindow(sessionDate, query) {
    const fromDate = parseInputDate(query.dateFrom)
    if (fromDate && sessionDate < fromDate) {
        return false
    }
    const toDate = parseInputDate(query.dateTo)
    if (!toDate) {
        return true
    }
    toDate.setHours(END_OF_DAY_HOURS, END_OF_DAY_MINUTES, END_OF_DAY_SECONDS, END_OF_DAY_MS)
    return sessionDate <= toDate
}

function resolvePresetDays(timePreset) {
    return timePreset === "30d" ? DAYS_IN_30D_PRESET : DAYS_IN_90D_PRESET
}

function parseSessionDate(value) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseInputDate(value) {
    if (!value) {
        return null
    }
    const parsed = new Date(`${value}${DEFAULT_DATE_SUFFIX}`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getTournamentFormatKey(session) {
    if (session.mode !== "tournament") {
        return null
    }
    return session.tournamentSeries?.format || session.tournamentFormat || null
}

function matchesMode(session, mode) {
    if (mode === "all") {
        return true
    }
    if (mode === "tournament") {
        return session.mode === "tournament"
    }
    if (session.mode === mode) {
        return true
    }
    if (session.mode !== "tournament") {
        return false
    }
    const teamSize = getTournamentTeamSize(session)
    if (mode === "singles") {
        return teamSize === 1
    }
    if (mode === "doubles") {
        return teamSize === 2
    }
    return false
}

function getTournamentTeamSize(session) {
    const matchType = session.tournamentSeries?.matchType
    if (matchType === "singles") {
        return 1
    }
    if (matchType === "doubles") {
        return 2
    }
    return session.tournamentTeamSize
}

function allowsTournamentFormat(mode) {
    return mode !== "free"
}

export {
    ANALYTICS_MODE_OPTIONS,
    ANALYTICS_TIME_PRESETS,
    createDefaultAnalyticsQuery,
    resolveAnalyticsContext,
    updateAnalyticsQuery,
}
