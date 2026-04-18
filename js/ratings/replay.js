import { calculateDoublesDelta, calculateSinglesDelta } from "./elo.js"

function createPlayerState(baselineRating) {
    return {
        rating: baselineRating,
        ratedMatchCount: 0,
        wins: 0,
        losses: 0,
        provisional: true,
        seasonHigh: baselineRating,
        seasonLow: baselineRating,
        deltaFromStart: 0,
        trend: [{ matchNumber: 0, rating: baselineRating }],
    }
}

function createLadderState() {
    return {
        players: {},
        leaderboard: [],
    }
}

function ensurePlayerState(ladder, playerName, baselineRating) {
    if (!ladder.players[playerName]) {
        ladder.players[playerName] = createPlayerState(baselineRating)
    }
    return ladder.players[playerName]
}

function updatePlayerAfterMatch({ player, didWin, delta, baselineRating, provisionalMatchThreshold }) {
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

function buildMatchContext(season, winnerIndex) {
    return {
        baselineRating: season.baselineRating,
        provisionalMatchThreshold: season.tuning.provisionalMatchThreshold,
        winnerIndex,
    }
}

function compareLeaderboardPlayers(players) {
    return (leftName, rightName) => {
        const left = players[leftName]
        const right = players[rightName]
        if (right.rating !== left.rating) {
            return right.rating - left.rating
        }
        if (right.wins !== left.wins) {
            return right.wins - left.wins
        }
        if (right.ratedMatchCount !== left.ratedMatchCount) {
            return right.ratedMatchCount - left.ratedMatchCount
        }
        return leftName.localeCompare(rightName)
    }
}

function finalizeLadder(ladder) {
    ladder.leaderboard = Object.keys(ladder.players).sort(compareLeaderboardPlayers(ladder.players))
    return ladder
}

function replaySinglesEvent(ladder, event, season) {
    const [teamA, teamB] = event.teams
    if (!(teamA.length === 1 && teamB.length === 1)) {
        return
    }
    const context = buildMatchContext(season, event.winnerIndex)
    const playerA = ensurePlayerState(ladder, teamA[0], season.baselineRating)
    const playerB = ensurePlayerState(ladder, teamB[0], season.baselineRating)
    const deltaA = calculateSinglesDelta({
        playerRating: playerA.rating,
        opponentRating: playerB.rating,
        didWin: event.winnerIndex === 0,
        player: playerA,
        tuning: season.tuning,
    })
    const deltaB = -deltaA
    updatePlayerAfterMatch({
        player: playerA,
        didWin: context.winnerIndex === 0,
        delta: deltaA,
        baselineRating: context.baselineRating,
        provisionalMatchThreshold: context.provisionalMatchThreshold,
    })
    updatePlayerAfterMatch({
        player: playerB,
        didWin: context.winnerIndex === 1,
        delta: deltaB,
        baselineRating: context.baselineRating,
        provisionalMatchThreshold: context.provisionalMatchThreshold,
    })
}

function replayDoublesEvent(ladder, event, season) {
    const [teamA, teamB] = event.teams
    if (!(teamA.length === 2 && teamB.length === 2)) {
        return
    }
    const context = buildMatchContext(season, event.winnerIndex)
    const teamOnePlayers = teamA.map((name) => ensurePlayerState(ladder, name, season.baselineRating))
    const teamTwoPlayers = teamB.map((name) => ensurePlayerState(ladder, name, season.baselineRating))
    const teamOneRating = teamOnePlayers.reduce((total, player) => total + player.rating, 0)
    const teamTwoRating = teamTwoPlayers.reduce((total, player) => total + player.rating, 0)
    const deltaA = calculateDoublesDelta({
        teamRating: teamOneRating,
        opponentTeamRating: teamTwoRating,
        didWin: context.winnerIndex === 0,
        teamPlayers: teamOnePlayers,
        tuning: season.tuning,
    })
    const deltaB = -deltaA
    for (const player of teamOnePlayers) {
        updatePlayerAfterMatch({
            player,
            didWin: context.winnerIndex === 0,
            delta: deltaA,
            baselineRating: context.baselineRating,
            provisionalMatchThreshold: context.provisionalMatchThreshold,
        })
    }
    for (const player of teamTwoPlayers) {
        updatePlayerAfterMatch({
            player,
            didWin: context.winnerIndex === 1,
            delta: deltaB,
            baselineRating: context.baselineRating,
            provisionalMatchThreshold: context.provisionalMatchThreshold,
        })
    }
}

function replayRatingEvents(events, season) {
    const ladders = {
        singles: createLadderState(),
        doubles: createLadderState(),
    }
    for (const event of events || []) {
        if (event.mode === "singles") {
            replaySinglesEvent(ladders.singles, event, season)
            continue
        }
        if (event.mode === "doubles") {
            replayDoublesEvent(ladders.doubles, event, season)
        }
    }
    return {
        singles: finalizeLadder(ladders.singles),
        doubles: finalizeLadder(ladders.doubles),
    }
}

export { replayRatingEvents }
