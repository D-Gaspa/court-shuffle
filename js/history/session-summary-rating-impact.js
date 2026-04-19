import { calculateDoublesDelta, calculateSinglesDelta } from "../ratings/elo.js"
import { collectSessionRatingEvents } from "../ratings/history-events.js"
import { buildRatingsModel } from "../ratings/model.js"
import { DEFAULT_BASELINE_RATING, getActiveRatingSeason } from "../ratings/seasons.js"

function createRatingReplayPlayer(player, baselineRating) {
    const rating = player?.rating ?? baselineRating
    return {
        rating,
        ratedMatchCount: player?.ratedMatchCount ?? 0,
        wins: player?.wins ?? 0,
        losses: player?.losses ?? 0,
        provisional: player?.provisional ?? true,
        seasonHigh: player?.seasonHigh ?? rating,
        seasonLow: player?.seasonLow ?? rating,
        deltaFromStart: player?.deltaFromStart ?? rating - baselineRating,
        trend: Array.isArray(player?.trend) ? [...player.trend] : [{ matchNumber: 0, rating }],
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

function buildSessionEventKey({ matchIndex, phaseIndex, roundIndex, tournamentIndex }) {
    return [phaseIndex, tournamentIndex, roundIndex, matchIndex].join(":")
}

function createTeamImpact(players, ratingDelta, won) {
    const names = players.filter(Boolean)
    if (names.length === 0 || !Number.isFinite(ratingDelta)) {
        return null
    }
    const roundedDelta = Math.round(ratingDelta)
    return {
        players: names,
        ratingDelta: roundedDelta,
        won,
        text: `${roundedDelta > 0 ? "+" : ""}${roundedDelta} Elo${names.length > 1 ? " each" : ""}`,
    }
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
    const teamOnePlayers = teamA.map((name) => ensureReplayPlayer(ladder, name, baselineRating))
    const teamTwoPlayers = teamB.map((name) => ensureReplayPlayer(ladder, name, baselineRating))
    const teamOneRating = teamOnePlayers.reduce((total, player) => total + player.rating, 0)
    const teamTwoRating = teamTwoPlayers.reduce((total, player) => total + player.rating, 0)
    const deltaA = calculateDoublesDelta({
        didWin: event.winnerIndex === 0,
        opponentTeamRating: teamTwoRating,
        teamPlayers: teamOnePlayers,
        teamRating: teamOneRating,
        tuning: season.tuning,
    })
    const deltaB = -deltaA
    for (const player of teamOnePlayers) {
        updateReplayPlayer({
            baselineRating,
            delta: deltaA,
            didWin: event.winnerIndex === 0,
            player,
            provisionalMatchThreshold: season.tuning.provisionalMatchThreshold,
        })
    }
    for (const player of teamTwoPlayers) {
        updateReplayPlayer({
            baselineRating,
            delta: deltaB,
            didWin: event.winnerIndex === 1,
            player,
            provisionalMatchThreshold: season.tuning.provisionalMatchThreshold,
        })
    }
    return [
        createTeamImpact(teamA, deltaA, event.winnerIndex === 0),
        createTeamImpact(teamB, deltaB, event.winnerIndex === 1),
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

function buildSessionRatingImpactMap({ beforeHistory, historyEntry, ratings }) {
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
    return impacts
}

export { buildSessionEventKey, buildSessionRatingImpactMap }
