import { buildRatingsModel } from "../ratings/model.js"
import { resolveSessionChampionName } from "./render-header.js"
import { getHistorySessionPlayers, getHistoryTournamentRuns } from "./session-phases.js"

const PERCENT_SCALE = 100

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
    if (historyEntry?.tournamentTeamSize === 1) {
        return "singles"
    }
    return "doubles"
}

function createSessionPlayerRow({ activePlayerSet, afterPlayer, afterRank, beforePlayer, beforeRank, name }) {
    const ratingDelta = (afterPlayer?.rating || 0) - (beforePlayer?.rating || 0)
    const rankDelta = beforeRank && afterRank ? beforeRank - afterRank : 0
    return {
        name,
        wasActiveInSession: activePlayerSet.has(name),
        beforeRank,
        afterRank,
        rankDelta,
        beforeRating: beforePlayer ? Math.round(beforePlayer.rating) : null,
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

function collectSessionPlayerRows({ afterLadder, beforeLadder, historyEntry }) {
    const beforeRanks = createRankMap(beforeLadder.leaderboard)
    const afterRanks = createRankMap(afterLadder.leaderboard)
    const activePlayerSet = new Set(getHistorySessionPlayers(historyEntry))
    const rows = collectLadderPlayerNames(beforeLadder, afterLadder).map((name) =>
        createSessionPlayerRow({
            activePlayerSet,
            name,
            beforePlayer: beforeLadder.players[name] || null,
            afterPlayer: afterLadder.players[name] || null,
            beforeRank: beforeRanks.get(name) || null,
            afterRank: afterRanks.get(name) || null,
        }),
    )

    rows.sort(compareSessionPlayerRows)
    return rows
}

function countScoredMatches(historyEntry) {
    const runs = getHistoryTournamentRuns(historyEntry)
    let played = 0
    let decided = 0

    for (const run of runs) {
        for (const round of run.rounds || []) {
            for (const score of round.scores || []) {
                if (!(score && Array.isArray(score.sets) && score.sets.length > 0)) {
                    continue
                }
                played += 1
                decided += 1
            }
        }
    }

    return { played, decided }
}

function buildMiniTournamentWinners(historyEntry) {
    const runs = getHistoryTournamentRuns(historyEntry)
    const winners = []
    for (let index = 0; index < runs.length; index += 1) {
        const champion = resolveChampionForRun(runs[index])
        if (!champion) {
            continue
        }
        winners.push({
            label: `Tournament ${index + 1}`,
            winner: champion,
        })
    }
    return winners
}

function resolveChampionForRun(run) {
    const championId = run?.bracket?.champion
    if (!(championId || championId === 0)) {
        return null
    }
    return run.teams?.find((team) => team.id === championId)?.name || null
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

    const notable = []
    if (biggestRatingGain) {
        notable.push({
            label: "Biggest Rating Gain",
            value: `${biggestRatingGain.name} +${biggestRatingGain.ratingDelta}`,
        })
    }
    if (biggestRankJump) {
        notable.push({
            label: "Biggest Rank Jump",
            value: `${biggestRankJump.name} +${biggestRankJump.rankDelta}`,
        })
    }
    return notable
}

function buildSessionSummaryPayload({ afterHistory, beforeHistory, historyEntry, ratings }) {
    const leaderboardMode = getLeaderboardMode(historyEntry)
    const beforeRatingsModel = buildRatingsModel({
        history: beforeHistory,
        ratings,
    })
    const afterRatingsModel = buildRatingsModel({
        history: afterHistory,
        ratings,
    })
    const beforeLadder = beforeRatingsModel.ladders[leaderboardMode]
    const afterLadder = afterRatingsModel.ladders[leaderboardMode]
    const playerRows = collectSessionPlayerRows({
        afterLadder,
        beforeLadder,
        historyEntry,
    })
    const matchSummary = countScoredMatches(historyEntry)

    return {
        createdAt: new Date().toISOString(),
        leaderboardMode,
        sessionId: historyEntry.id,
        title: resolveSessionChampionName(historyEntry) || "Session Report",
        date: historyEntry.date,
        players: getHistorySessionPlayers(historyEntry),
        matchSummary,
        miniTournamentWinners: buildMiniTournamentWinners(historyEntry),
        notableResults: buildNotableResults(playerRows),
        leaderboard: playerRows,
    }
}

export { buildSessionSummaryPayload }
