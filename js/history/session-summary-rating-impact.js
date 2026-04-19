import {
    calculateDoublesDelta,
    calculateDoublesPlayerExpectedScore,
    calculateDoublesSideExpectedScores,
    calculateSinglesDelta,
} from "../ratings/elo.js"
import { collectSessionRatingEvents } from "../ratings/history-events.js"
import { buildRatingsModel } from "../ratings/model.js"
import { DEFAULT_BASELINE_RATING, getActiveRatingSeason } from "../ratings/seasons.js"

function createRatingReplayPlayer(player, baselineRating) {
    const rating = player?.rating ?? baselineRating
    const trend = Array.isArray(player?.trend) ? [...player.trend] : [{ matchNumber: 0, rating }]
    return {
        rating,
        ratedMatchCount: player?.ratedMatchCount ?? 0,
        wins: player?.wins ?? 0,
        losses: player?.losses ?? 0,
        provisional: player?.provisional ?? true,
        seasonHigh: player?.seasonHigh ?? rating,
        seasonLow: player?.seasonLow ?? rating,
        deltaFromStart: player?.deltaFromStart ?? rating - baselineRating,
        trend,
    }
}

function cloneReplayLadder(ladder, baselineRating) {
    const players = {}
    for (const [name, player] of Object.entries(ladder?.players || {})) {
        players[name] = createRatingReplayPlayer(player, baselineRating)
    }
    return {
        players,
        leaderboard: [...(ladder?.leaderboard || [])],
    }
}

function ensureReplayPlayer(ladder, name, baselineRating) {
    if (!ladder.players[name]) {
        ladder.players[name] = createRatingReplayPlayer(null, baselineRating)
    }
    return ladder.players[name]
}

function updateReplayPlayer({ baselineRating, delta, didWin, player, provisionalMatchThreshold }) {
    player.rating += delta
    player.ratedMatchCount += 1
    player.provisional = player.ratedMatchCount < provisionalMatchThreshold
    player.deltaFromStart = player.rating - baselineRating
    player.seasonHigh = Math.max(player.seasonHigh, player.rating)
    player.seasonLow = Math.min(player.seasonLow, player.rating)
    player.trend.push({
        matchNumber: player.ratedMatchCount,
        rating: player.rating,
    })
    if (didWin) {
        player.wins += 1
        return
    }
    player.losses += 1
}

function buildSessionEventKey({ matchIndex, phaseIndex, roundIndex, sessionId = "", tournamentIndex }) {
    return [sessionId, phaseIndex, tournamentIndex, roundIndex, matchIndex].join(":")
}

function createTeamImpact(players, ratingDeltas, won) {
    const names = players.filter(Boolean)
    const deltas = Array.isArray(ratingDeltas) ? ratingDeltas.filter((delta) => Number.isFinite(delta)) : []
    if (names.length === 0 || deltas.length === 0) {
        return null
    }
    const roundedDeltas = deltas.map((delta) => Math.round(delta))
    const [firstDelta] = roundedDeltas
    const sharedDelta = roundedDeltas.every((delta) => delta === firstDelta)
    return {
        players: names,
        ratingDelta: sharedDelta
            ? firstDelta
            : Math.round(roundedDeltas.reduce((sum, delta) => sum + delta, 0) / roundedDeltas.length),
        won,
        text: sharedDelta
            ? `${firstDelta > 0 ? "+" : ""}${firstDelta} Elo${names.length > 1 ? " each" : ""}`
            : names
                  .map((name, index) => `${name} ${roundedDeltas[index] > 0 ? "+" : ""}${roundedDeltas[index]}`)
                  .join(", "),
    }
}

function applyDoublesReplaySide({
    baselineRating,
    opponentTeamRating,
    opponentTeamSize,
    ownExpected,
    ownPlayers,
    ownTeamSize,
    provisionalMatchThreshold,
    tuning,
    won,
}) {
    const actual = won ? 1 : 0
    const deltas = []
    for (const player of ownPlayers) {
        const expected = calculateDoublesPlayerExpectedScore({
            ownRating: player.rating,
            ownSideExpected: ownExpected,
            opponentTeamRating,
            ownTeamSize,
            opponentTeamSize,
        })
        const delta = calculateDoublesDelta({
            actual,
            expected,
            player,
            tuning,
        })
        deltas.push(delta)
        updateReplayPlayer({
            baselineRating,
            delta,
            didWin: won,
            player,
            provisionalMatchThreshold,
        })
    }
    return deltas
}

function applySinglesSessionRatingEvent({ baselineRating, event, ladder, season }) {
    const [teamA, teamB] = event.teams
    const playerA = ensureReplayPlayer(ladder, teamA[0], baselineRating)
    const playerB = ensureReplayPlayer(ladder, teamB[0], baselineRating)
    const deltaA = calculateSinglesDelta({
        didWin: event.winnerIndex === 0,
        opponentRating: playerB.rating,
        player: playerA,
        playerRating: playerA.rating,
        tuning: season.tuning,
    })
    const deltaB = -deltaA
    updateReplayPlayer({
        baselineRating,
        delta: deltaA,
        didWin: event.winnerIndex === 0,
        player: playerA,
        provisionalMatchThreshold: season.tuning.provisionalMatchThreshold,
    })
    updateReplayPlayer({
        baselineRating,
        delta: deltaB,
        didWin: event.winnerIndex === 1,
        player: playerB,
        provisionalMatchThreshold: season.tuning.provisionalMatchThreshold,
    })
    return [
        createTeamImpact(teamA, deltaA, event.winnerIndex === 0),
        createTeamImpact(teamB, deltaB, event.winnerIndex === 1),
    ]
}

function applyDoublesSessionRatingEvent({ baselineRating, event, ladder, season }) {
    const [teamA, teamB] = event.teams
    const validTeamSize = (team) => team.length === 1 || team.length === 2
    if (!(validTeamSize(teamA) && validTeamSize(teamB))) {
        return []
    }
    const teamOnePlayers = teamA.map((name) => ensureReplayPlayer(ladder, name, baselineRating))
    const teamTwoPlayers = teamB.map((name) => ensureReplayPlayer(ladder, name, baselineRating))
    const expectedScores = calculateDoublesSideExpectedScores({
        baselineRating,
        sideOnePlayerRatings: teamOnePlayers.map((player) => player.rating),
        sideTwoPlayerRatings: teamTwoPlayers.map((player) => player.rating),
    })
    if (!expectedScores) {
        return []
    }

    const teamOneDeltas = applyDoublesReplaySide({
        baselineRating,
        ownPlayers: teamOnePlayers,
        ownExpected: expectedScores.sideOneExpected,
        ownTeamSize: teamA.length,
        opponentTeamRating: expectedScores.sideTwoTeamRating,
        opponentTeamSize: teamB.length,
        provisionalMatchThreshold: season.tuning.provisionalMatchThreshold,
        tuning: season.tuning,
        won: event.winnerIndex === 0,
    })
    const teamTwoDeltas = applyDoublesReplaySide({
        baselineRating,
        ownPlayers: teamTwoPlayers,
        ownExpected: expectedScores.sideTwoExpected,
        ownTeamSize: teamB.length,
        opponentTeamRating: expectedScores.sideOneTeamRating,
        opponentTeamSize: teamA.length,
        provisionalMatchThreshold: season.tuning.provisionalMatchThreshold,
        tuning: season.tuning,
        won: event.winnerIndex === 1,
    })
    return [
        createTeamImpact(teamA, teamOneDeltas, event.winnerIndex === 0),
        createTeamImpact(teamB, teamTwoDeltas, event.winnerIndex === 1),
    ]
}

function applySessionRatingEvent({ baselineRating, event, ladder, season }) {
    if (event.mode === "singles") {
        return applySinglesSessionRatingEvent({ baselineRating, event, ladder, season })
    }
    if (event.mode === "doubles") {
        return applyDoublesSessionRatingEvent({ baselineRating, event, ladder, season })
    }
    return []
}

function buildHistoryEntriesRatingImpactMap({ beforeHistory, historyEntries, ratings }) {
    const season = getActiveRatingSeason(ratings)
    if (!season) {
        return new Map()
    }
    const baselineRating = season.baselineRating || DEFAULT_BASELINE_RATING
    const beforeRatingsModel = buildRatingsModel({
        history: beforeHistory,
        ratings,
    })
    const ladders = {
        singles: cloneReplayLadder(beforeRatingsModel.ladders.singles, baselineRating),
        doubles: cloneReplayLadder(beforeRatingsModel.ladders.doubles, baselineRating),
    }
    const impacts = new Map()
    for (const historyEntry of historyEntries || []) {
        for (const event of collectSessionRatingEvents(historyEntry, season)) {
            impacts.set(
                buildSessionEventKey(event),
                applySessionRatingEvent({
                    baselineRating,
                    event,
                    ladder: ladders[event.mode],
                    season,
                }).filter(Boolean),
            )
        }
    }
    return impacts
}

function buildSessionRatingImpactMap({ beforeHistory, historyEntry, ratings }) {
    return buildHistoryEntriesRatingImpactMap({
        beforeHistory,
        historyEntries: historyEntry ? [historyEntry] : [],
        ratings,
    })
}

export { buildHistoryEntriesRatingImpactMap, buildSessionEventKey, buildSessionRatingImpactMap }
