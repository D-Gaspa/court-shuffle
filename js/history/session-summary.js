import { buildRatingsModel } from "../ratings/model.js"
import { DEFAULT_BASELINE_RATING, getActiveRatingSeason } from "../ratings/seasons.js"
import { buildHistoryNightGroups, compareHistoryEntries } from "./night-groups.js"
import { getHistorySessionPlayers } from "./session-phases.js"
import {
    buildMiniTournamentWinners,
    buildNotableResults,
    buildTournamentRecapSections,
    collectPlayerRows,
    countScoredMatches,
    formatNightSummaryTitle,
    formatRecapDate,
    formatSummaryTitle,
    getLeaderboardMode,
} from "./session-summary-core.js"
import { buildHistoryEntriesRatingImpactMap, buildSessionRatingImpactMap } from "./session-summary-rating-impact.js"

function buildSessionSummaryPayload({ afterHistory, beforeHistory, historyEntry, ratings }) {
    const leaderboardMode = getLeaderboardMode(historyEntry)
    const activeSeason = getActiveRatingSeason(ratings)
    const beforeRatingsModel = buildRatingsModel({ history: beforeHistory, ratings })
    const afterRatingsModel = buildRatingsModel({ history: afterHistory, ratings })
    const playerRows = collectPlayerRows({
        afterLadder: afterRatingsModel.ladders[leaderboardMode],
        baselineRating: activeSeason?.baselineRating || DEFAULT_BASELINE_RATING,
        beforeLadder: beforeRatingsModel.ladders[leaderboardMode],
        historyEntries: [historyEntry],
    })
    return {
        createdAt: new Date().toISOString(),
        type: "session-summary",
        leaderboardMode,
        sessionId: historyEntry.id,
        title: formatSummaryTitle(historyEntry),
        date: historyEntry.date,
        players: getHistorySessionPlayers(historyEntry),
        matchSummary: countScoredMatches(historyEntry),
        miniTournamentWinners: buildMiniTournamentWinners(historyEntry),
        notableResults: buildNotableResults(playerRows),
        leaderboard: playerRows,
        tournamentRecap: buildTournamentRecapSections(
            historyEntry,
            buildSessionRatingImpactMap({ beforeHistory, historyEntry, ratings }),
        ),
    }
}

function buildNightTournamentRecap(historyEntries, ratingImpactMap) {
    return historyEntries.flatMap((historyEntry, sessionIndex) =>
        buildTournamentRecapSections(historyEntry, ratingImpactMap).map((section) => ({
            ...section,
            label:
                section.label === "Session Recap"
                    ? `Session ${sessionIndex + 1} · ${formatRecapDate(historyEntry.date)}`
                    : `Session ${sessionIndex + 1} · ${formatRecapDate(historyEntry.date)} · ${section.label}`,
        })),
    )
}

function buildNightMiniTournamentWinners(historyEntries) {
    return historyEntries.flatMap((historyEntry, sessionIndex) =>
        buildMiniTournamentWinners(historyEntry).map((winner) => ({
            label: `Session ${sessionIndex + 1} · ${winner.label}`,
            winner: winner.winner,
        })),
    )
}

function buildNightSummaryPayload({ afterHistory, beforeHistory, group, ratings }) {
    const historyEntries = group.sessions
    const lastEntry = historyEntries.at(-1)
    const leaderboardMode = getLeaderboardMode(lastEntry)
    const activeSeason = getActiveRatingSeason(ratings)
    const beforeRatingsModel = buildRatingsModel({ history: beforeHistory, ratings })
    const afterRatingsModel = buildRatingsModel({ history: afterHistory, ratings })
    const playerRows = collectPlayerRows({
        afterLadder: afterRatingsModel.ladders[leaderboardMode],
        baselineRating: activeSeason?.baselineRating || DEFAULT_BASELINE_RATING,
        beforeLadder: beforeRatingsModel.ladders[leaderboardMode],
        historyEntries,
    })
    return {
        createdAt: new Date().toISOString(),
        type: "night-summary",
        leaderboardMode,
        sessionId: lastEntry?.id || group.id,
        nightGroupId: group.id,
        title: formatNightSummaryTitle(historyEntries),
        date: lastEntry?.date || group.date,
        players: [...new Set(historyEntries.flatMap((entry) => getHistorySessionPlayers(entry)))],
        matchSummary: historyEntries.reduce(
            (summary, entry) => {
                const counts = countScoredMatches(entry)
                return {
                    played: summary.played + counts.played,
                    decided: summary.decided + counts.decided,
                }
            },
            { played: 0, decided: 0 },
        ),
        miniTournamentWinners: buildNightMiniTournamentWinners(historyEntries),
        notableResults: buildNotableResults(playerRows),
        leaderboard: playerRows,
        tournamentRecap: buildNightTournamentRecap(
            historyEntries,
            buildHistoryEntriesRatingImpactMap({
                beforeHistory,
                historyEntries,
                ratings,
            }),
        ),
    }
}

function buildSummaryFromHistoryIndex({ history, index, ratings }) {
    const historyEntry = history[index]
    if (!historyEntry) {
        return null
    }
    if (historyEntry.sessionSummary) {
        return historyEntry.sessionSummary
    }
    return buildSessionSummaryPayload({
        afterHistory: history.slice(0, index + 1),
        beforeHistory: history.slice(0, index),
        historyEntry,
        ratings,
    })
}

function buildNightSummaryFromGroup({ group, history, ratings }) {
    const orderedHistory = [...history].sort(compareHistoryEntries)
    const [firstEntry] = group.sessions
    const lastEntry = group.sessions.at(-1)
    const firstIndex = orderedHistory.findIndex((historyEntry) => historyEntry.id === firstEntry?.id)
    const lastIndex = orderedHistory.findIndex((historyEntry) => historyEntry.id === lastEntry?.id)
    if (firstIndex === -1 || lastIndex === -1 || lastIndex < firstIndex) {
        return null
    }
    return buildNightSummaryPayload({
        afterHistory: orderedHistory.slice(0, lastIndex + 1),
        beforeHistory: orderedHistory.slice(0, firstIndex),
        group,
        ratings,
    })
}

function resolveSessionSummary({ archivedHistory = [], entry, history = [], ratings }) {
    if (!entry) {
        return null
    }
    const orderedHistory = [...history, ...archivedHistory]
        .filter((historyEntry) => historyEntry && historyEntry.provisional !== true)
        .sort(compareHistoryEntries)
    if (entry.type === "night-group" && Array.isArray(entry.sessions) && entry.sessions.length > 0) {
        return buildNightSummaryFromGroup({
            group: entry,
            history: orderedHistory,
            ratings,
        })
    }
    if (entry.sessionSummary) {
        return entry.sessionSummary
    }
    const index = orderedHistory.findIndex((historyEntry) => historyEntry.id === entry.id)
    return index === -1 ? null : buildSummaryFromHistoryIndex({ history: orderedHistory, index, ratings })
}

function findLatestNightGroup(history, selectedMode) {
    const groups = buildHistoryNightGroups((history || []).filter((entry) => entry && entry.provisional !== true))
    for (let index = groups.length - 1; index >= 0; index -= 1) {
        const group = groups[index]
        const lastSession = group.sessions.at(-1)
        if (lastSession && getLeaderboardMode(lastSession) === selectedMode) {
            return group
        }
    }
    return null
}

export { buildSessionSummaryPayload, findLatestNightGroup, resolveSessionSummary }
