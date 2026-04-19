import { buildRatingsModel } from "../ratings/model.js"
import { DEFAULT_BASELINE_RATING, getActiveRatingSeason } from "../ratings/seasons.js"
import { formatSets } from "../score-editor/sets.js"
import { getModeLabel } from "../shared/utils.js"
import { determineMatchWinner } from "../tournament/utils.js"
import { getHistorySessionPlayers, getHistoryTournamentPhases, getHistoryTournamentRuns } from "./session-phases.js"
import { buildSessionEventKey, buildSessionRatingImpactMap } from "./session-summary-rating-impact.js"

const PERCENT_SCALE = 100
const SUMMARY_DATE_FORMAT = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
}

function formatPercent(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "—"
    }
    return `${Math.round(value * PERCENT_SCALE)}%`
}

function createRankMap(leaderboard) {
    const ranks = new Map()
    for (let index = 0; index < (leaderboard || []).length; index += 1) {
        ranks.set(leaderboard[index], index + 1)
    }
    return ranks
}

function collectLadderPlayerNames(beforeLadder, afterLadder) {
    return [...new Set([...Object.keys(beforeLadder.players || {}), ...Object.keys(afterLadder.players || {})])]
}

function getLeaderboardMode(historyEntry) {
    return historyEntry?.tournamentTeamSize === 1 ? "singles" : "doubles"
}

function createSessionPlayerRow({
    activePlayerSet,
    afterPlayer,
    afterRank,
    beforePlayer,
    beforeRank,
    baselineRating,
    name,
}) {
    const startingRating = beforePlayer?.rating ?? baselineRating
    const ratingDelta = (afterPlayer?.rating ?? startingRating) - startingRating
    return {
        name,
        wasActiveInSession: activePlayerSet.has(name),
        beforeRank,
        afterRank,
        rankDelta: beforeRank && afterRank ? beforeRank - afterRank : 0,
        beforeRating: beforePlayer ? Math.round(beforePlayer.rating) : Math.round(startingRating),
        afterRating: afterPlayer ? Math.round(afterPlayer.rating) : null,
        ratingDelta: Math.round(ratingDelta),
        wins: afterPlayer?.wins || 0,
        losses: afterPlayer?.losses || 0,
        winRate: afterPlayer
            ? formatPercent(afterPlayer.ratedMatchCount > 0 ? afterPlayer.wins / afterPlayer.ratedMatchCount : null)
            : "—",
        games: afterPlayer?.ratedMatchCount || 0,
    }
}

function compareSessionPlayerRows(left, right) {
    if ((left.afterRank || Number.MAX_SAFE_INTEGER) !== (right.afterRank || Number.MAX_SAFE_INTEGER)) {
        return (left.afterRank || Number.MAX_SAFE_INTEGER) - (right.afterRank || Number.MAX_SAFE_INTEGER)
    }
    return left.name.localeCompare(right.name)
}

function collectSessionPlayerRows({ afterLadder, baselineRating, beforeLadder, historyEntry }) {
    const beforeRanks = createRankMap(beforeLadder.leaderboard)
    const afterRanks = createRankMap(afterLadder.leaderboard)
    const activePlayerSet = new Set(getHistorySessionPlayers(historyEntry))
    return collectLadderPlayerNames(beforeLadder, afterLadder)
        .map((name) =>
            createSessionPlayerRow({
                activePlayerSet,
                afterPlayer: afterLadder.players[name] || null,
                afterRank: afterRanks.get(name) || null,
                beforePlayer: beforeLadder.players[name] || null,
                beforeRank: beforeRanks.get(name) || null,
                baselineRating,
                name,
            }),
        )
        .sort(compareSessionPlayerRows)
}

function resolveChampionForRun(run) {
    const championId = run?.bracket?.champion
    if (!(championId || championId === 0)) {
        return null
    }
    return run.teams?.find((team) => team.id === championId)?.name || null
}

function buildMatchRecap({ match, matchIndex, ratingImpacts, round }) {
    const scoreEntry = round?.scores?.[matchIndex] || null
    const score = scoreEntry?.sets?.length > 0 ? formatSets(scoreEntry.sets) : null
    const winnerIndex = scoreEntry ? determineMatchWinner(scoreEntry) : null
    const teams = (match?.teams || []).map((team, index) => ({
        label: `Team ${index + 1}`,
        players: Array.isArray(team) ? team : [],
        won: winnerIndex === index,
        ratingImpact: ratingImpacts[index] || null,
    }))
    return {
        courtLabel: `Court ${match?.court || matchIndex + 1}`,
        pool: match?.bracketPool || "",
        teams,
        score: score || "No score",
        winnerLabel:
            winnerIndex === null ? "" : teams[winnerIndex]?.players?.join(", ") || teams[winnerIndex]?.label || "",
    }
}

function buildTournamentRecap(historyEntry, ratingImpactMap) {
    const phases = getHistoryTournamentPhases(historyEntry)
    return phases.map((phase, phaseIndex) => ({
        label: phases.length > 1 ? `Phase ${phaseIndex + 1}` : "Session Recap",
        players: phase.players || [],
        tournaments: (phase?.tournamentSeries?.tournaments || [])
            .filter((run) => Array.isArray(run?.rounds) && run.rounds.length > 0)
            .map((run, tournamentIndex) => ({
                label: `Tournament ${tournamentIndex + 1}`,
                winner: resolveChampionForRun(run) || "",
                rounds: (run.rounds || []).map((round, roundIndex) => ({
                    label: round.tournamentRoundLabel || `Round ${roundIndex + 1}`,
                    matches: (round.matches || []).map((match, matchIndex) =>
                        buildMatchRecap({
                            match,
                            matchIndex,
                            ratingImpacts:
                                ratingImpactMap.get(
                                    buildSessionEventKey({
                                        matchIndex,
                                        phaseIndex,
                                        roundIndex,
                                        tournamentIndex,
                                    }),
                                ) || [],
                            round,
                        }),
                    ),
                })),
            })),
    }))
}

function countScoredMatches(historyEntry) {
    let played = 0
    for (const run of getHistoryTournamentRuns(historyEntry)) {
        for (const round of run.rounds || []) {
            for (const score of round.scores || []) {
                if (score && Array.isArray(score.sets) && score.sets.length > 0) {
                    played += 1
                }
            }
        }
    }
    return { played, decided: played }
}

function buildMiniTournamentWinners(historyEntry) {
    const winners = []
    for (let index = 0; index < getHistoryTournamentRuns(historyEntry).length; index += 1) {
        const champion = resolveChampionForRun(getHistoryTournamentRuns(historyEntry)[index])
        if (champion) {
            winners.push({
                label: `Tournament ${index + 1}`,
                winner: champion,
            })
        }
    }
    return winners
}

function buildNotableResults(playerRows) {
    const biggestRatingGain =
        [...playerRows]
            .filter((row) => row.ratingDelta > 0)
            .sort((left, right) => right.ratingDelta - left.ratingDelta || left.name.localeCompare(right.name))[0] ||
        null
    const biggestRankJump =
        [...playerRows]
            .filter((row) => row.rankDelta > 0)
            .sort((left, right) => right.rankDelta - left.rankDelta || left.name.localeCompare(right.name))[0] || null
    return [
        biggestRatingGain
            ? {
                  label: "Biggest Rating Gain",
                  value: `${biggestRatingGain.name} +${biggestRatingGain.ratingDelta}`,
              }
            : null,
        biggestRankJump
            ? {
                  label: "Biggest Rank Jump",
                  value: `${biggestRankJump.name} +${biggestRankJump.rankDelta}`,
              }
            : null,
    ].filter(Boolean)
}

function formatSummaryTitle(historyEntry) {
    const date = new Date(historyEntry?.date || "")
    const dateText = Number.isNaN(date.getTime())
        ? "Session Summary"
        : date.toLocaleDateString(undefined, SUMMARY_DATE_FORMAT)
    return `${dateText} · ${getModeLabel(historyEntry)}`
}

function buildSessionSummaryPayload({ afterHistory, beforeHistory, historyEntry, ratings }) {
    const leaderboardMode = getLeaderboardMode(historyEntry)
    const activeSeason = getActiveRatingSeason(ratings)
    const beforeRatingsModel = buildRatingsModel({ history: beforeHistory, ratings })
    const afterRatingsModel = buildRatingsModel({ history: afterHistory, ratings })
    const playerRows = collectSessionPlayerRows({
        afterLadder: afterRatingsModel.ladders[leaderboardMode],
        baselineRating: activeSeason?.baselineRating || DEFAULT_BASELINE_RATING,
        beforeLadder: beforeRatingsModel.ladders[leaderboardMode],
        historyEntry,
    })
    return {
        createdAt: new Date().toISOString(),
        leaderboardMode,
        sessionId: historyEntry.id,
        title: formatSummaryTitle(historyEntry),
        date: historyEntry.date,
        players: getHistorySessionPlayers(historyEntry),
        matchSummary: countScoredMatches(historyEntry),
        miniTournamentWinners: buildMiniTournamentWinners(historyEntry),
        notableResults: buildNotableResults(playerRows),
        leaderboard: playerRows,
        tournamentRecap: buildTournamentRecap(
            historyEntry,
            buildSessionRatingImpactMap({ beforeHistory, historyEntry, ratings }),
        ),
    }
}

function compareHistoryEntries(left, right) {
    const leftTime = new Date(left?.date || 0).getTime()
    const rightTime = new Date(right?.date || 0).getTime()
    if (leftTime !== rightTime) {
        return leftTime - rightTime
    }
    return String(left?.id || "").localeCompare(String(right?.id || ""))
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

function resolveSessionSummary({ archivedHistory = [], entry, history = [], ratings }) {
    if (!entry) {
        return null
    }
    if (entry.sessionSummary) {
        return entry.sessionSummary
    }
    const orderedHistory = [...history, ...archivedHistory]
        .filter((historyEntry) => historyEntry && historyEntry.provisional !== true)
        .sort(compareHistoryEntries)
    const index = orderedHistory.findIndex((historyEntry) => historyEntry.id === entry.id)
    return index === -1 ? null : buildSummaryFromHistoryIndex({ history: orderedHistory, index, ratings })
}

export { buildSessionSummaryPayload, resolveSessionSummary }
